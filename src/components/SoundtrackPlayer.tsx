import { useEffect, useRef, useState } from "react";
import { logAlbumGradient } from "../lib/sampleGradient";
import { PlayIcon, PauseIcon } from "./icons";

type Album = {
  title: string;
  artist: string;
  artwork: string | null;
};

type Track = {
  id: number;
  title: string;
  durationMs: number | null;
};

const API = import.meta.env.VITE_MOVIE_API;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

interface SoundtrackPlayerProps {
  movieId: number;
}

export default function SoundtrackPlayer({ movieId }: SoundtrackPlayerProps) {
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const activeBandsCount = 16;

  // Sync isPlaying state with document class for the CSS background dissolve
  useEffect(() => {
    document.documentElement.classList.toggle("is-playing", isPlaying);
    return () => document.documentElement.classList.remove("is-playing");
  }, [isPlaying]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      stopLogging();
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch (e) {}
      }
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = "";
        } catch (e) {}
      }
    };
  }, []);

  function stopLogging() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function startLogging() {
    if (!analyserRef.current) return;
    const buffer = new Uint8Array(analyserRef.current.frequencyBinCount);
    const tick = () => {
      analyserRef.current?.getByteFrequencyData(buffer);
      const bands = Array.from({ length: activeBandsCount }, (_, b) => {
        const idx = Math.floor(
          (b / (activeBandsCount - 1)) * (buffer.length - 1),
        );
        return (buffer[idx] / 255).toFixed(3);
      });
      console.log(`HZFFT|${bands.join(",")}`);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function initAudioGraph() {
    if (!audioRef.current) return;

    try {
      // Clean up existing graph
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {}
        sourceRef.current = null;
      }

      if (audioCtxRef.current && audioCtxRef.current.state === "closed") {
        audioCtxRef.current = null;
      }

      if (!audioCtxRef.current) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = ctx.createMediaElementSource(audioRef.current);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
        console.log("Audio graph initialized");
      }
    } catch (err) {
      console.error("Failed to initialize audio graph:", err);
    }
  }

  async function selectTrack(track: Track) {
    const audio = audioRef.current;
    if (!audio || isLoading) return;

    setIsLoading(true);
    setError(null);
    stopLogging();

    try {
      // Pause and reset
      audio.pause();
      audio.src = "";
      audio.load();

      initAudioGraph();

      // Resume audio context if suspended
      try {
        if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          await audioCtxRef.current.resume();
          console.log("Audio context resumed");
        }
      } catch (err) {
        console.error("Failed to resume audio context:", err);
      }

      // If same track, toggle playback
      if (currentId === track.id) {
        try {
          if (isPlaying) {
            audio.pause();
          } else {
            await audio.play();
          }
        } catch (err) {
          console.error("Playback failed:", err);
          setError("Failed to play audio");
        }
        setIsLoading(false);
        return;
      }

      setCurrentId(track.id);
      setCurrentTime(0);
      setDuration(0);

      const audioUrl = `${API}/api/preview/${track.id}`;
      console.log("Loading audio from:", audioUrl);

      audio.src = audioUrl;

      // Use canplay event for faster loading
      await new Promise<void>((resolve, reject) => {
        let isResolved = false;
        const timeout = setTimeout(() => {
          if (!isResolved) {
            audio.removeEventListener("canplay", onCanPlay);
            audio.removeEventListener("loadeddata", onLoadedData);
            audio.removeEventListener("error", onError);
            reject(new Error("Loading timeout"));
          }
        }, 30000);

        const onCanPlay = () => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            audio.removeEventListener("canplay", onCanPlay);
            audio.removeEventListener("loadeddata", onLoadedData);
            audio.removeEventListener("error", onError);
            console.log("Audio can play");
            resolve();
          }
        };

        const onLoadedData = () => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            audio.removeEventListener("canplay", onCanPlay);
            audio.removeEventListener("loadeddata", onLoadedData);
            audio.removeEventListener("error", onError);
            console.log("Audio data loaded");
            resolve();
          }
        };

        const onError = () => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            audio.removeEventListener("canplay", onCanPlay);
            audio.removeEventListener("loadeddata", onLoadedData);
            audio.removeEventListener("error", onError);
            const error = audio.error;
            console.error("Audio load error:", error?.code, error?.message);
            reject(new Error(error?.message || "Unknown error"));
          }
        };

        audio.addEventListener("canplay", onCanPlay);
        audio.addEventListener("loadeddata", onLoadedData);
        audio.addEventListener("error", onError);
        audio.load();
      });

      await audio.play();
      console.log("Audio playing successfully");

    } catch (err) {
      console.error("Playback failed:", err);
      setError(err instanceof Error ? err.message : "Failed to load or play audio");
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return;
    const bar = e.currentTarget.getBoundingClientRect();
    const newTime = ((e.clientX - bar.left) / bar.width) * audio.duration;
    if (isFinite(newTime) && newTime >= 0 && newTime <= audio.duration) {
      audio.currentTime = newTime;
    }
  }

  useEffect(() => {
    fetch(`${API}/api/movie/${movieId}/tracks`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tracks");
        return res.json();
      })
      .then((data) => {
        setAlbum(data.album);
        setTracks(data.tracks);
      })
      .catch((err) => {
        console.error("Error loading tracks:", err);
        setError("Failed to load soundtrack");
      });
  }, [movieId]);

  const progress = duration && isFinite(duration) ? (currentTime / duration) * 100 : 0;

  return (
    <div className="c-player">
      {album && (
        <div className="c-player__album">
          {album.artwork && (
            <img
              className="c-player__art"
              src={album.artwork}
              alt={album.title}
            />
          )}
          <div className="c-player__album-info">
            <div className="c-player__album-title">{album.title}</div>
            <div className="c-player__album-artist">{album.artist}</div>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            color: "#ff6b6b",
            fontSize: "0.85rem",
            padding: "0.5rem",
            background: "rgba(255,0,0,0.1)",
            borderRadius: "4px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {isLoading && (
        <div
          style={{ color: "#e6b45a", fontSize: "0.85rem", padding: "0.5rem" }}
        >
          ⏳ Loading audio...
        </div>
      )}

      <ul className="c-player__tracks">
        {tracks.map((track) => {
          const isActive = currentId === track.id;
          return (
            <li key={track.id} data-active={isActive || undefined}>
              <button
                type="button"
                className="c-player__track"
                data-active={isActive || undefined}
                onClick={() => selectTrack(track)}
                disabled={isLoading}
              >
                <span className="c-player__icon">
                  {isLoading && isActive ? (
                    <span style={{ fontSize: "0.8em" }}>⏳</span>
                  ) : isActive && isPlaying ? (
                    <PauseIcon />
                  ) : (
                    <PlayIcon />
                  )}
                </span>
                <span className="c-player__track-title">{track.title}</span>
                <span className="c-player__time">
                  {formatTime((track.durationMs ?? 0) / 1000)}
                </span>
              </button>

              {isActive && isPlaying && (
                <div className="c-player__scrubber">
                  <span className="c-player__time">
                    {formatTime(currentTime)}
                  </span>
                  <div className="c-player__seek" onClick={seek}>
                    <div
                      className="c-player__seek-fill"
                      style={{
                        width: `${Math.min(100, Math.max(0, progress))}%`,
                      }}
                    />
                  </div>
                  <span className="c-player__time">{formatTime(duration)}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="metadata"
        onTimeUpdate={(e) => {
          const time = e.currentTarget.currentTime;
          if (isFinite(time)) setCurrentTime(time);
        }}
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          if (isFinite(dur)) setDuration(dur);
          console.log("Metadata loaded, duration:", dur);
        }}
        onLoadedData={() => {
          console.log("Data loaded");
        }}
        onCanPlay={() => {
          console.log("Can play event");
        }}
        onPlaying={() => {
          console.log("Playing event");
          setIsPlaying(true);
          setError(null);
          if (album?.artwork) logAlbumGradient(album.artwork);

          try {
            if (analyserRef.current && audioCtxRef.current) {
              analyserRef.current.connect(audioCtxRef.current.destination);
              if (audioCtxRef.current.state === "suspended") {
                audioCtxRef.current.resume().catch(console.error);
              }
            }
          } catch (err) {
            console.error("Failed to connect audio graph:", err);
          }

          startLogging();
        }}
        onPause={() => {
          console.log("Paused");
          setIsPlaying(false);
          stopLogging();

          try {
            if (analyserRef.current) {
              analyserRef.current.disconnect();
            }
          } catch (err) {}
        }}
        onEnded={() => {
          console.log("Ended");
          const idx = tracks.findIndex((t) => t.id === currentId);
          if (tracks[idx + 1]) {
            selectTrack(tracks[idx + 1]);
          } else {
            setIsPlaying(false);
            stopLogging();
          }
        }}
        onError={(e) => {
          const audio = e.currentTarget;
          const error = audio.error;
          console.error("Audio error:", error?.code, error?.message);

          let errorMessage = "Playback error";
          if (error?.code === 1) errorMessage = "Playback was aborted";
          else if (error?.code === 2) errorMessage = "Network error";
          else if (error?.code === 3) errorMessage = "Audio decoding failed";
          else if (error?.code === 4) errorMessage = "Audio format not supported";

          setError(errorMessage);
          setIsPlaying(false);
          setIsLoading(false);
          stopLogging();
        }}
        onStalled={() => {
          console.warn("Audio stalled, attempting recovery...");
        }}
      />
    </div>
  );
}
