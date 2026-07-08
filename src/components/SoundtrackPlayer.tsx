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

  // WebAudio graph
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rawRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Logging
  const rafRef = useRef<number | null>(null);
  const lastSendMsRef = useRef<number>(0);

  const LOG_EVERY_MS = 50;
  const activeBandsCount: number = 16;

  function stopLogging() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = null;
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

  function ensureGraphInitialized() {
    const audio = audioRef.current;
    if (!audio) return;

    // MediaElementSource is one-per-media-element; keep it stable.
    if (
      audioCtxRef.current &&
      analyserRef.current &&
      sourceRef.current &&
      rawRef.current
    )
      return;

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

  async function resumeAudioContextIfNeeded() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state !== "running") {
      await ctx.resume().catch(() => {});
    }
  }

  useEffect(() => {
    return () => {
      stopLogging();

      try {
        analyserRef.current?.disconnect();
      } catch {}

      try {
        sourceRef.current?.disconnect();
      } catch {}

      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
      rawRef.current = null;

      if (ctx) {
        ctx.close().catch(() => {});
      }
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

  async function unlockAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = true;

    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } catch (err) {
      console.log("Audio unlock failed:", err);
    }

    audio.muted = false;
  }

  async function selectTrack(track: Track) {
    const audio = audioRef.current;
    if (!audio) return;

    ensureGraphInitialized();

    // Toggle current track
    if (currentId === track.id) {
      if (audio.paused) {
        await resumeAudioContextIfNeeded().catch(() => {});
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
      // onPlay will startLogging + setIsPlaying
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
                onClick={async () => {
                  await unlockAudio();
                  await selectTrack(track);
                }}
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
        preload="metadata"
        onPlay={() => {
          setIsPlaying(true);
          resumeAudioContextIfNeeded()
            .finally(() => {
              ensureGraphInitialized();
              startLogging();
            })
            .catch(() => {
              ensureGraphInitialized();
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
