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

  // Refs for audio elements – one per track
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  // Web Audio graph – shared across tracks
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const activeSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const isTransitioning = useRef(false);
  const currentTrackIndexRef = useRef<number>(-1);

  const activeBandsCount = 16;

  // Sync playing state with CSS
  useEffect(() => {
    document.documentElement.classList.toggle("is-playing", isPlaying);
    return () => document.documentElement.classList.remove("is-playing");
  }, [isPlaying]);

  // Clean up Web Audio on unmount
  useEffect(() => {
    return () => {
      stopLogging();
      if (activeSourceRef.current) {
        try { activeSourceRef.current.disconnect(); } catch (e) {}
        activeSourceRef.current = null;
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch (e) {}
        analyserRef.current = null;
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Shared analyser and context – initialised once
  function initSharedAudioGraph() {
    if (audioCtxRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      // Connect analyser to destination once
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      console.log("[Audio] Shared graph initialised");
    } catch (err) {
      console.error("[Audio] Failed to init shared graph:", err);
    }
  }

  // Connect a specific audio element to the shared analyser
  function connectAudioElement(audio: HTMLAudioElement) {
    try {
      // Disconnect previous active source
      if (activeSourceRef.current) {
        try { activeSourceRef.current.disconnect(); } catch (e) {}
        activeSourceRef.current = null;
      }

      const ctx = audioCtxRef.current;
      if (!ctx) throw new Error("AudioContext not ready");
      const analyser = analyserRef.current;
      if (!analyser) throw new Error("Analyser not ready");

      // Create a new source node for this audio element
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser); // analyser is already connected to destination

      activeSourceRef.current = source;

      // Resume context if suspended
      if (ctx.state === "suspended") {
        ctx.resume().catch(console.error);
      }

      console.log("[Audio] Connected new audio element to graph");
    } catch (err) {
      console.error("[Audio] Failed to connect element:", err);
      throw new Error(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // FFT logging
  function stopLogging() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function startLogging() {
    if (!analyserRef.current) {
      console.warn("[Audio] No analyser");
      return;
    }
    const buffer = new Uint8Array(analyserRef.current.frequencyBinCount);
    let frameCount = 0;
    const tick = () => {
      try {
        analyserRef.current?.getByteFrequencyData(buffer);
        const bands = Array.from({ length: activeBandsCount }, (_, b) => {
          const idx = Math.floor((b / (activeBandsCount - 1)) * (buffer.length - 1));
          return (buffer[idx] / 255).toFixed(3);
        });
        frameCount++;
        if (frameCount % 30 === 0) {
          console.log(`HZFFT|${bands.join(",")}`);
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        console.error("[Audio] Logging error:", err);
        stopLogging();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  // Play a specific track (by its audio element)
  async function playTrack(track: Track) {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    setIsLoading(true);
    setError(null);
    stopLogging();

    try {
      const audio = audioRefs.current.get(track.id);
      if (!audio) throw new Error(`No audio element for track ${track.id}`);

      // Pause all other tracks
      for (const [id, el] of audioRefs.current) {
        if (id !== track.id && !el.paused) {
          el.pause();
        }
      }

      // Reset UI time for this track
      setCurrentTime(0);
      setDuration(0);

      // Ensure shared graph exists
      initSharedAudioGraph();

      // If already playing, just resume
      if (!audio.paused) {
        setIsPlaying(true);
        setCurrentId(track.id);
        const idx = tracks.findIndex(t => t.id === track.id);
        if (idx !== -1) currentTrackIndexRef.current = idx;
        setIsLoading(false);
        isTransitioning.current = false;
        return;
      }

      // Connect this audio element to the graph
      connectAudioElement(audio);

      // Wait for metadata if not yet loaded
      if (!audio.duration || !isFinite(audio.duration)) {
        await new Promise<void>((resolve, reject) => {
          let resolved = false;
          const timeout = setTimeout(() => {
            if (!resolved) {
              audio.removeEventListener("loadedmetadata", onLoaded);
              audio.removeEventListener("error", onError);
              reject(new Error("Metadata load timeout"));
            }
          }, 30000);
          const onLoaded = () => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeout);
            audio.removeEventListener("loadedmetadata", onLoaded);
            audio.removeEventListener("error", onError);
            resolve();
          };
          const onError = () => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeout);
            audio.removeEventListener("loadedmetadata", onLoaded);
            audio.removeEventListener("error", onError);
            reject(new Error(audio.error?.message || "Media error"));
          };
          audio.addEventListener("loadedmetadata", onLoaded);
          audio.addEventListener("error", onError);
          audio.load();
        });
      }

      // Update duration
      if (isFinite(audio.duration)) {
        setDuration(audio.duration);
      }

      // Resume context if suspended
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }

      // Play
      await audio.play();
      console.log(`[Audio] Playing track ${track.id}`);

      setIsPlaying(true);
      setCurrentId(track.id);
      setError(null);

      const idx = tracks.findIndex(t => t.id === track.id);
      if (idx !== -1) currentTrackIndexRef.current = idx;

      if (album?.artwork) logAlbumGradient(album.artwork);
      setTimeout(() => startLogging(), 200);

    } catch (err) {
      console.error("[Audio] Playback error:", err);
      setError(err instanceof Error ? err.message : "Playback failed");
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
      isTransitioning.current = false;
    }
  }

  // User click on a track
  async function selectTrack(track: Track) {
    const audio = audioRefs.current.get(track.id);
    if (!audio || isLoading || isTransitioning.current) return;

    if (currentId === track.id) {
      // Toggle
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
          setError("Resume failed");
          await playTrack(track);
        }
      }
      return;
    }

    // Different track
    await playTrack(track);
  }

  // Auto-advance: listen to the 'ended' event on the currently playing audio
  useEffect(() => {
    if (!currentId) return;
    const audio = audioRefs.current.get(currentId);
    if (!audio) return;

    const onEnded = () => {
      console.log("[Audio] Track ended");
      const nextIdx = currentTrackIndexRef.current + 1;
      if (tracks[nextIdx]) {
        currentTrackIndexRef.current = nextIdx;
        setTimeout(() => playTrack(tracks[nextIdx]), 150);
      } else if (tracks.length > 0) {
        currentTrackIndexRef.current = 0;
        setTimeout(() => playTrack(tracks[0]), 500);
      } else {
        setIsPlaying(false);
        stopLogging();
      }
    };

    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("ended", onEnded);
    };
  }, [currentId, tracks]);

  // Seek bar
  function seek(e: React.MouseEvent<HTMLDivElement>) {
    if (!currentId) return;
    const audio = audioRefs.current.get(currentId);
    if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(x * audio.duration, audio.duration));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }

  // Load track list from API
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
        console.error("[API] Error:", err);
        setError("Failed to load soundtrack");
      });
  }, [movieId]);

  // Update currentTime from the playing audio element
  useEffect(() => {
    if (!currentId) return;
    const audio = audioRefs.current.get(currentId);
    if (!audio) return;

    const update = () => {
      if (isPlaying && audio) {
        const t = audio.currentTime;
        if (isFinite(t)) setCurrentTime(t);
      }
    };
    audio.addEventListener("timeupdate", update);
    return () => {
      audio.removeEventListener("timeupdate", update);
    };
  }, [currentId, isPlaying]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="c-player">
      {album && (
        <div className="c-player__album">
          {album.artwork && <img className="c-player__art" src={album.artwork} alt={album.title} />}
          <div className="c-player__album-info">
            <div className="c-player__album-title">{album.title}</div>
            <div className="c-player__album-artist">{album.artist}</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: "#ff6b6b", fontSize: "0.85rem", padding: "0.5rem", background: "rgba(255,0,0,0.1)", borderRadius: "4px" }}>
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
                  <span className="c-player__time">{formatTime(currentTime)}</span>
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

      {/* Hidden audio elements – one per track */}
      <div style={{ display: "none" }}>
        {tracks.map((track) => (
          <audio
            key={track.id}
            crossOrigin="anonymous"
            ref={(el) => {
              if (el) audioRefs.current.set(track.id, el);
            }}
            preload="metadata"
            src={`${API}/api/preview/${track.id}`}
            onLoadedMetadata={(e) => {
              // When metadata loads, we could store duration if needed
              if (currentId === track.id && isFinite(e.currentTarget.duration)) {
                setDuration(e.currentTarget.duration);
              }
            }}
            onError={(e) => {
              console.error(`[Audio] Error loading track ${track.id}:`, e.currentTarget.error);
            }}
          />
        ))}
      </div>
    </div>
  );
}
