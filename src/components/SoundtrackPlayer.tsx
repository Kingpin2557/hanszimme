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

  // Refs for audio graph
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Track switching guards
  const isTransitioning = useRef(false);
  const currentTrackIndexRef = useRef<number>(-1);

  // Force new audio element on track change
  const [audioKey, setAudioKey] = useState(0);

  const activeBandsCount = 16;

  // UI: sync document class with playing state
  useEffect(() => {
    document.documentElement.classList.toggle("is-playing", isPlaying);
    return () => document.documentElement.classList.remove("is-playing");
  }, [isPlaying]);

  // Clean up audio graph resources
  function cleanupAudioGraph() {
    stopLogging();
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) {}
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch (e) {}
      analyserRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }
  }

  // Build a fresh audio graph for the current audio element
  async function setupAudioGraph(): Promise<void> {
    const audio = audioRef.current;
    if (!audio) {
      throw new Error("No audio element available to connect");
    }

    try {
      // Ensure old graph is gone
      cleanupAudioGraph();

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;

      console.log("[Audio] Graph set up for new audio element");

      // Resume if suspended
      if (ctx.state === "suspended") {
        await ctx.resume();
        console.log("[Audio] Context resumed");
      }
    } catch (err) {
      console.error("[Audio] Graph setup failed:", err);
      throw new Error(`Audio graph setup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // FFT logging loop
  function stopLogging() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function startLogging() {
    if (!analyserRef.current) {
      console.warn("[Audio] No analyser node – cannot start logging");
      return;
    }

    const buffer = new Uint8Array(analyserRef.current.frequencyBinCount);
    let frameCount = 0;

    const tick = () => {
      try {
        analyserRef.current?.getByteFrequencyData(buffer);
        const bands = Array.from({ length: activeBandsCount }, (_, b) => {
          const idx = Math.floor(
            (b / (activeBandsCount - 1)) * (buffer.length - 1)
          );
          return (buffer[idx] / 255).toFixed(3);
        });

        frameCount++;
        if (frameCount % 30 === 0) {
          console.log(`HZFFT|${bands.join(",")}`);
        }

        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        console.error("[Audio] Logging loop error:", err);
        stopLogging();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  // Load and play a track (creates new audio element)
  async function playTrack(track: Track) {
    if (isTransitioning.current) {
      console.warn("[Audio] Already transitioning, ignoring play request");
      return;
    }
    isTransitioning.current = true;
    setIsLoading(true);
    setError(null);
    stopLogging();

    try {
      // 1. Clean up old graph
      cleanupAudioGraph();

      // 2. Force a new audio element
      setAudioKey((prev) => prev + 1);

      // 3. Wait for React to mount the new element
      await new Promise((resolve) => setTimeout(resolve, 0));

      const audio = audioRef.current;
      if (!audio) {
        throw new Error("Audio element not found after recreation");
      }

      // 4. Reset UI time
      setCurrentTime(0);
      setDuration(0);

      // 5. Set the source URL
      const audioUrl = `${API}/api/preview/${track.id}`;
      console.log(`[Audio] Loading: ${audioUrl}`);
      audio.src = audioUrl;

      // 6. Wait for metadata (with timeout)
      await new Promise<void>((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            audio.removeEventListener("loadedmetadata", onLoaded);
            audio.removeEventListener("error", onError);
            reject(new Error("Metadata load timeout (30s)"));
          }
        }, 30000);

        const onLoaded = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          audio.removeEventListener("loadedmetadata", onLoaded);
          audio.removeEventListener("error", onError);
          console.log(`[Audio] Metadata loaded, duration: ${audio.duration}`);
          if (isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
          resolve();
        };

        const onError = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          audio.removeEventListener("loadedmetadata", onLoaded);
          audio.removeEventListener("error", onError);
          const err = audio.error;
          reject(new Error(err?.message || "Unknown media error"));
        };

        audio.addEventListener("loadedmetadata", onLoaded);
        audio.addEventListener("error", onError);
        audio.load();
      });

      // 7. Build fresh audio graph for this new element
      await setupAudioGraph();

      // 8. Start playback
      await audio.play();
      console.log("[Audio] Playback started");

      setIsPlaying(true);
      setCurrentId(track.id);
      setError(null);

      const idx = tracks.findIndex((t) => t.id === track.id);
      if (idx !== -1) {
        currentTrackIndexRef.current = idx;
      }

      if (album?.artwork) logAlbumGradient(album.artwork);

      // Start FFT logging after a short delay
      setTimeout(() => startLogging(), 200);

    } catch (err) {
      console.error("[Audio] Playback failed:", err);
      setError(err instanceof Error ? err.message : "Failed to load or play audio");
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
      isTransitioning.current = false;
    }
  }

  // User‑facing track selection
  async function selectTrack(track: Track) {
    const audio = audioRef.current;
    if (!audio || isLoading || isTransitioning.current) {
      console.warn("[Audio] Cannot select track – busy or no element");
      return;
    }

    if (currentId === track.id) {
      // Toggle playback on same track
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        stopLogging();
      } else {
        try {
          await audio.play();
          setIsPlaying(true);
          setTimeout(() => startLogging(), 200);
        } catch (err) {
          console.error("[Audio] Resume failed:", err);
          setError("Failed to resume playback");
          // Fallback: reload track
          await playTrack(track);
        }
      }
      return;
    }

    // Different track – full reload
    await playTrack(track);
  }

  // Auto‑advance to next track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      console.log("[Audio] Track ended");
      const nextIdx = currentTrackIndexRef.current + 1;
      if (tracks[nextIdx]) {
        console.log(`[Audio] Advancing to: ${tracks[nextIdx].title}`);
        currentTrackIndexRef.current = nextIdx;
        setTimeout(() => playTrack(tracks[nextIdx]), 150);
      } else {
        console.log("[Audio] Album finished, looping to first track");
        if (tracks.length > 0) {
          currentTrackIndexRef.current = 0;
          setTimeout(() => playTrack(tracks[0]), 500);
        } else {
          setIsPlaying(false);
          stopLogging();
        }
      }
    };

    const onStalled = () => {
      console.warn("[Audio] Stalled – attempting recovery");
      if (isPlaying && audio) {
        setTimeout(() => {
          if (audio.paused && isPlaying) {
            audio.play().catch(console.error);
          }
        }, 1000);
      }
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("stalled", onStalled);

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("stalled", onStalled);
    };
  }, [tracks]);

  // Seek bar interaction
  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(x * audio.duration, audio.duration));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }

  // Load track list
  useEffect(() => {
    fetch(`${API}/api/movie/${movieId}/tracks`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setAlbum(data.album);
        setTracks(data.tracks);
      })
      .catch((err) => {
        console.error("[API] Track fetch error:", err);
        setError("Failed to load soundtrack");
      });
  }, [movieId]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

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
        <div style={{ color: "#e6b45a", fontSize: "0.85rem", padding: "0.5rem" }}>
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
                disabled={isLoading || isTransitioning.current}
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
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                  <span className="c-player__time">{formatTime(duration)}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Hidden audio element – re‑created on key change */}
      <div style={{ display: "none" }}>
        <audio
          key={audioKey}
          ref={audioRef}
          preload="auto"
          onTimeUpdate={(e) => {
            const time = e.currentTarget.currentTime;
            if (isFinite(time)) setCurrentTime(time);
          }}
          onLoadedMetadata={(e) => {
            const dur = e.currentTarget.duration;
            if (isFinite(dur)) {
              setDuration(dur);
              console.log(`[Audio] Metadata loaded: ${dur}s`);
            }
          }}
          onLoadedData={() => console.log("[Audio] Data loaded")}
          onCanPlay={() => console.log("[Audio] Can play")}
          onPlaying={() => {
            console.log("[Audio] Playing event");
            setIsPlaying(true);
            setError(null);
            if (album?.artwork) logAlbumGradient(album.artwork);
          }}
          onPause={() => {
            console.log("[Audio] Paused");
            setIsPlaying(false);
            stopLogging();
          }}
          onError={(e) => {
            const audio = e.currentTarget;
            const err = audio.error;
            console.error("[Audio] Error:", err?.code, err?.message);

            let msg = "Playback error";
            if (err?.code === 1) msg = "Playback aborted";
            else if (err?.code === 2) msg = "Network error";
            else if (err?.code === 3) msg = "Decoding failed";
            else if (err?.code === 4) msg = "Format not supported";

            setError(msg);
            setIsPlaying(false);
            setIsLoading(false);
            stopLogging();
          }}
          onStalled={() => console.warn("[Audio] Stalled")}
        />
      </div>
    </div>
  );
}
