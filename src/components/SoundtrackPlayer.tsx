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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio graph (keep stable)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rawRef = useRef<Uint8Array | null>(null);

  // Logging
  const rafRef = useRef<number>(0);
  const lastSendMsRef = useRef<number>(0);
  const LOG_EVERY_MS = 50; // ~20 packets/sec
  const activeBandsCount = 16;

  function ensureGraphInitialized() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audioCtxRef.current && analyserRef.current && sourceRef.current) return;

    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audio);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.0;

    source.connect(analyser);
    analyser.connect(ctx.destination);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;

    rawRef.current = new Uint8Array(analyser.frequencyBinCount);
  }

  function teardownGraph() {
    stopLogging();
    try {
      analyserRef.current?.disconnect();
    } catch {}
    try {
      sourceRef.current?.disconnect();
    } catch {}
    try {
      audioCtxRef.current?.close();
    } catch {}

    analyserRef.current = null;
    sourceRef.current = null;
    audioCtxRef.current = null;
    rawRef.current = null;
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      teardownGraph();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch(`${API}/api/movie/${movieId}/tracks`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setAlbum(data?.album ?? null);
        setTracks(data?.tracks ?? []);
      })
      .catch(() => setTracks([]));
  }, [movieId]);

  useEffect(() => {
    if (album?.artwork) logAlbumGradient(album.artwork);
  }, [album?.artwork]);

  useEffect(() => {
    document.documentElement.classList.toggle("is-playing", isPlaying);
    return () => document.documentElement.classList.remove("is-playing");
  }, [isPlaying]);

  function stopLogging() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }

  async function resumeAudioContextIfNeeded() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch {}
    }
  }

  function startLogging() {
    const analyser = analyserRef.current;
    const raw = rawRef.current;
    if (!analyser || !raw) return;

    const tick = () => {
      analyser.getByteFrequencyData(raw);

      const now = performance.now();
      if (now - lastSendMsRef.current >= LOG_EVERY_MS) {
        lastSendMsRef.current = now;

        const binCount = raw.length;
        let sum = 0;

        // Evenly sample bins -> N bands
        const bands: string[] = new Array(activeBandsCount);
        for (let b = 0; b < activeBandsCount; b++) {
          const t = activeBandsCount === 1 ? 0 : b / (activeBandsCount - 1);
          const idx = Math.min(
            binCount - 1,
            Math.max(0, Math.floor(t * (binCount - 1))),
          );
          const v = raw[idx] / 255;
          sum += v;
          bands[b] = v.toFixed(3);
        }

        const level = (sum / activeBandsCount).toFixed(3);
        console.log(`HZFFT|${level}|${bands.join(",")}`);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  async function selectTrack(track: Track) {
    const audio = audioRef.current;
    if (!audio) return;

    ensureGraphInitialized();

    if (currentId === track.id) {
      if (audio.paused) {
        try {
          await resumeAudioContextIfNeeded();
        } catch {}
        audio
          .play()
          .catch((err) => console.log("play() failed (toggle):", err));
      } else {
        audio.pause();
      }
      return;
    }

    setCurrentId(track.id);
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    stopLogging();

    audio.crossOrigin = "anonymous";
    audio.src = `${API}/api/preview/${track.id}`;
    audio.load();

    try {
      await audio.play();
      await resumeAudioContextIfNeeded();
      // onPlay handler will startLogging + setIsPlaying(true)
    } catch (err) {
      console.log("play() failed:", err);
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return;

    const bar = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - bar.left) / bar.width) * audio.duration;
  }

  if (tracks.length === 0) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;

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
              >
                <span className="c-player__icon">
                  {isActive && isPlaying ? <PauseIcon /> : <PlayIcon />}
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
                      style={{ width: `${progress}%` }}
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
        onPlay={() => {
          setIsPlaying(true);
          resumeAudioContextIfNeeded().finally(() => {
            startLogging();
          });
        }}
        onPause={() => {
          setIsPlaying(false);
          stopLogging();
        }}
        onEnded={() => {
          const index = tracks.findIndex((t) => t.id === currentId);
          const next = tracks[index + 1];
          if (next) selectTrack(next);
          else {
            setIsPlaying(false);
            stopLogging();
          }
        }}
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          setDuration(a.duration || 0);
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setCurrentTime(a.currentTime);
        }}
        onError={(e) => {
          const a = e.currentTarget;
          console.log("audio error:", {
            code: a.error?.code,
            message: a.error?.message || `MEDIA_ERR_${a.error?.code ?? "?"}`,
          });
        }}
      />
    </div>
  );
}
