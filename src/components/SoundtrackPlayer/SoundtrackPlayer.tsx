import "./SoundtrackPlayer.css";
import { useEffect, useRef, useState } from "react";
import { logAlbumGradient } from "../../lib/sampleGradient";
import { PlayIcon, PauseIcon } from "../icons/icons";

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
  album: Album | null;
  tracks: Track[];
}

export default function SoundtrackPlayer({ album, tracks }: SoundtrackPlayerProps) {
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  const durationMap = useRef<Map<number, number>>(new Map());
  const tracksRef = useRef<HTMLUListElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const activeSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const sourceMap = useRef<Map<HTMLAudioElement, MediaElementAudioSourceNode>>(
    new Map(),
  );
  const rafRef = useRef<number | null>(null);

  const isTransitioning = useRef(false);
  const currentTrackIndexRef = useRef<number>(-1);

  const activeBandsCount = 16;

  useEffect(() => {
    document.documentElement.classList.toggle("is-playing", isPlaying);
    return () => document.documentElement.classList.remove("is-playing");
  }, [isPlaying]);

  useEffect(() => {
    if (currentId == null) return;
    const container = tracksRef.current;
    const el = container?.querySelector<HTMLElement>(
      `[data-track-id="${currentId}"]`,
    );
    if (!container || !el) return;
    const delta =
      el.getBoundingClientRect().top - container.getBoundingClientRect().top;
    container.scrollTo({ top: container.scrollTop + delta, behavior: "smooth" });
  }, [currentId]);

  useEffect(() => {
    return () => {
      stopLogging();

      for (const el of audioRefs.current.values()) {
        try {
          el.pause();
          el.removeAttribute("src");
          el.load();
        } catch (e) { void e; }
      }
      audioRefs.current.clear();
      durationMap.current.clear();
      for (const source of sourceMap.current.values()) {
        try { source.disconnect(); } catch (e) { void e; }
      }
      sourceMap.current.clear();
      activeSourceRef.current = null;
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch (e) { void e; }
        analyserRef.current = null;
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) { void e; }
        audioCtxRef.current = null;
      }
    };
  }, []);

  function initSharedAudioGraph() {
    if (audioCtxRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
    } catch (err) {
      console.error("[Audio] Failed to init shared graph:", err);
    }
  }

  function connectAudioElement(audio: HTMLAudioElement) {
    const ctx = audioCtxRef.current;
    const analyser = analyserRef.current;
    if (!ctx || !analyser) throw new Error("Audio graph not ready");

    if (activeSourceRef.current) {
      try { activeSourceRef.current.disconnect(); } catch (e) { void e; }
      activeSourceRef.current = null;
    }

    let source = sourceMap.current.get(audio);
    if (!source) {
      source = ctx.createMediaElementSource(audio);
      sourceMap.current.set(audio, source);
    }
    source.connect(analyser);
    activeSourceRef.current = source;

    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  }

  function stopLogging() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function startLogging() {
    if (!analyserRef.current) {
      console.warn("[Audio] No analyser – cannot log FFT");
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

  async function playTrack(track: Track) {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    setIsLoading(true);
    setError(null);
    stopLogging();

    try {
      const audio = audioRefs.current.get(track.id);
      if (!audio) throw new Error(`No audio element for track ${track.id}`);

      for (const [id, el] of audioRefs.current) {
        if (id !== track.id && !el.paused) el.pause();
      }

      setCurrentTime(0);
      setDuration(0);

      initSharedAudioGraph();
      connectAudioElement(audio);

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

      const dur = durationMap.current.get(track.id) ?? audio.duration;
      if (isFinite(dur)) setDuration(dur);

      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }

      try { audio.currentTime = 0; } catch (e) { void e; }
      await audio.play();

      setIsPlaying(true);
      setCurrentId(track.id);
      setError(null);

      const idx = tracks.findIndex((t) => t.id === track.id);
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

  async function selectTrack(track: Track) {
    const audio = audioRefs.current.get(track.id);
    if (!audio || isLoading || isTransitioning.current) return;

    if (currentId === track.id) {

      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        stopLogging();
      } else {
        try {
          if (audioCtxRef.current?.state === "suspended") {
            await audioCtxRef.current.resume();
          }
          await audio.play();
          setIsPlaying(true);
          setTimeout(() => startLogging(), 200);
        } catch (err) {
          console.error("[Audio] Resume failed:", err);
          setError("Resume failed");
        }
      }
      return;
    }

    await playTrack(track);
  }

  function handleEnded(trackId: number) {
    const idx = tracks.findIndex((t) => t.id === trackId);
    const next = idx === -1 ? undefined : tracks[idx + 1];

    if (next) {
      currentTrackIndexRef.current = idx + 1;
      setTimeout(() => playTrack(next), 150);
    } else {

      setIsPlaying(false);
      setCurrentTime(0);
      stopLogging();
    }
  }

  function handleDurationChange(trackId: number, e: React.SyntheticEvent<HTMLAudioElement>) {
    const dur = e.currentTarget.duration;
    if (Number.isFinite(dur)) {
      durationMap.current.set(trackId, dur);
      if (currentId === trackId) setDuration(dur);
    }
  }

  function handleTimeUpdate(trackId: number, e: React.SyntheticEvent<HTMLAudioElement>) {
    if (currentId !== trackId) return;
    const t = e.currentTarget.currentTime;
    if (Number.isFinite(t)) setCurrentTime(t);
  }

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
              width={48}
              height={48}
            />
          )}
          <div className="c-player__album-info">
            <div className="c-player__album-title">{album.title}</div>
            <div className="c-player__album-artist">{album.artist}</div>
          </div>
        </div>
      )}

      {error && <div className="c-player__error">⚠️ {error}</div>}

      {isLoading && (
        <div className="c-player__loading">⏳ Loading audio...</div>
      )}

      <ul className="c-player__tracks" ref={tracksRef}>
        {tracks.map((track) => {
          const isActive = currentId === track.id;
          return (
            <li key={track.id} data-track-id={track.id} data-active={isActive || undefined}>
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

      <div style={{ display: "none" }}>
        {tracks.map((track) => (
          <audio
            key={track.id}
            crossOrigin="anonymous"
            ref={(el) => {
              if (el) audioRefs.current.set(track.id, el);
            }}
            preload="auto"
            src={`${API}/api/preview/${track.id}`}
            onDurationChange={(e) => handleDurationChange(track.id, e)}
            onTimeUpdate={(e) => handleTimeUpdate(track.id, e)}
            onEnded={() => handleEnded(track.id)}
            onError={(e) => {
              console.error(`[Audio] Error loading track ${track.id}:`, e.currentTarget.error);
            }}
          />
        ))}
      </div>
    </div>
  );
}
