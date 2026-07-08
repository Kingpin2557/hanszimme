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

  function stopLogging() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
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
      // Clean up existing graph if it exists
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
        sourceRef.current = null;
      }

      // If context exists but is closed, create new one
      if (audioCtxRef.current && audioCtxRef.current.state === "closed") {
        audioCtxRef.current = null;
      }

      if (!audioCtxRef.current) {
        const ctx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        const source = ctx.createMediaElementSource(audioRef.current);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;

        // Don't connect to destination yet, we'll do it on play
        source.connect(analyser);

        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
      }
    } catch (err) {
      console.error("Failed to initialize audio graph:", err);
      // Fallback: continue without audio analysis
    }
  }

  async function selectTrack(track: Track) {
    const audio = audioRef.current;
    if (!audio || isLoading) return;

    setIsLoading(true);
    setError(null);
    stopLogging();

    try {
      // Pause current playback
      audio.pause();

      // Reset audio element for new track
      audio.src = "";
      audio.load();

      // Initialize audio graph
      initAudioGraph();

      // Resume audio context on user interaction
      try {
        if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          await audioCtxRef.current.resume();
        }
      } catch (err) {
        console.error("Failed to resume audio context:", err);
      }

      // If it's the same track, toggle playback
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

      // Set the audio source
      const audioUrl = `${API}/api/preview/${track.id}`;
      console.log("Loading audio from:", audioUrl);
      audio.src = audioUrl;

      // For WAV files, we need to handle loading differently
      // WAV files can be played directly without special handling
      try {
        // Try to play immediately
        await audio.play();
      } catch (playErr) {
        console.error("Direct play failed, waiting for canplay:", playErr);
        // If direct play fails, wait for canplay
        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            audio.removeEventListener("canplay", onCanPlay);
            audio.removeEventListener("error", onError);
            resolve();
          };
          const onError = () => {
            audio.removeEventListener("canplay", onCanPlay);
            audio.removeEventListener("error", onError);
            reject(new Error("Failed to load audio"));
          };
          audio.addEventListener("canplay", onCanPlay);
          audio.addEventListener("error", onError);
          audio.load();
        });

        // Now try playing again
        await audio.play();
      }
    } catch (err) {
      console.error("Playback failed:", err);
      setError("Failed to load or play audio");
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

  const progress =
    duration && isFinite(duration) ? (currentTime / duration) * 100 : 0;

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
          style={{ color: "#ff6b6b", fontSize: "0.85rem", padding: "0.5rem" }}
        >
          ⚠️ {error}
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
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setError(null);
          if (album?.artwork) logAlbumGradient(album.artwork);

          // Connect to destination and resume context on play
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
          setIsPlaying(false);
          stopLogging();

          // Disconnect analyser from destination on pause
          try {
            if (analyserRef.current) {
              analyserRef.current.disconnect();
            }
          } catch (err) {
            // Ignore disconnect errors
          }
        }}
        onEnded={() => {
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

          // Try recovery for certain errors
          if (error?.code === 4) {
            // MEDIA_ERR_SRC_NOT_SUPPORTED
            setError("Audio format not supported. Try MP3 instead.");
          } else if (error?.code === 2) {
            // MEDIA_ERR_NETWORK
            setError("Network error loading audio. Please try again.");
          } else {
            setError(`Playback error: ${error?.message || "Unknown error"}`);
          }

          setIsPlaying(false);
          setIsLoading(false);
          stopLogging();
        }}
        onStalled={() => {
          console.warn("Audio stalled, attempting recovery...");
        }}
        onSuspend={() => {
          console.log("Audio suspended");
        }}
      />
    </div>
  );
}
