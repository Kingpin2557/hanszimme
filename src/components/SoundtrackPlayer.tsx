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

  // WebAudio graph (rebuilt on each new track click)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Logging (throttled)
  const rafRef = useRef<number>(0);
  const lastLogMsRef = useRef<number>(0);
  const LOG_EVERY_MS = 100; // max ~10 lines/sec

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
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("is-playing", isPlaying);
    return () => document.documentElement.classList.remove("is-playing");
  }, [isPlaying]);

  function startLogging() {
    stopLogging();

    const analyser = analyserRef.current;
    if (!analyser) return;

    const raw = new Uint8Array(analyser.frequencyBinCount);

    const logFrame = () => {
      analyser.getByteFrequencyData(raw);

      const now = performance.now();
      if (now - lastLogMsRef.current >= LOG_EVERY_MS) {
        lastLogMsRef.current = now;

        let sum = 0;
        const bands = Array.from(raw, (v) => {
          sum += v;
          return (v / 255).toFixed(3);
        });
        const level = (sum / raw.length / 255).toFixed(3);

        console.log(`HZFFT|${level}|${bands.join(",")}`);
      }

      rafRef.current = requestAnimationFrame(logFrame);
    };

    lastLogMsRef.current = 0;
    rafRef.current = requestAnimationFrame(logFrame);
  }

  function stopLogging() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }

  async function buildAnalyserFresh() {
    // Disconnect/close previous graph
    try {
      sourceRef.current?.disconnect();
    } catch {}
    try {
      analyserRef.current?.disconnect();
    } catch {}
    try {
      await audioCtxRef.current?.close();
    } catch {}

    sourceRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current = null;

    const audio = audioRef.current;
    if (!audio) return;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;

    source.connect(analyser);
    analyser.connect(ctx.destination);

    sourceRef.current = source;
    analyserRef.current = analyser;

    // Must be resumed during the click path
    await ctx.resume().catch(() => {});
  }

  async function selectTrack(track: Track) {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentId === track.id) {
      if (audio.paused) {
        try {
          await audioCtxRef.current?.resume();
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

    await buildAnalyserFresh();

    audio
      .play()
      .then(() => {
        // onPlay handler will flip isPlaying + startLogging
      })
      .catch((err) => {
        console.log("play() failed:", err);
      });
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
          console.log("[audio] onPlay", {
            src: audioRef.current?.src,
            currentTime: audioRef.current?.currentTime,
            duration: audioRef.current?.duration,
            paused: audioRef.current?.paused,
            readyState: audioRef.current?.readyState,
          });
          setIsPlaying(true);
          startLogging();
        }}
        onPause={() => {
          console.log("[audio] onPause", {
            src: audioRef.current?.src,
            currentTime: audioRef.current?.currentTime,
            paused: audioRef.current?.paused,
          });
          setIsPlaying(false);
          stopLogging();
        }}
        onEnded={() => {
          console.log("[audio] onEnded");
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
          console.log("[audio] onLoadedMetadata", {
            duration: a.duration,
            currentTime: a.currentTime,
            readyState: a.readyState,
          });
          setDuration(a.duration || 0);
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setCurrentTime(a.currentTime);
        }}
        onWaiting={() => console.log("[audio] onWaiting")}
        onStalled={() => console.log("[audio] onStalled")}
        onError={(e) => {
          const a = e.currentTarget;
          console.log("[audio] onError", {
            code: a.error?.code,
            message: a.error?.message || `MEDIA_ERR_${a.error?.code ?? "?"}`,
          });
        }}
      />
    </div>
  );
}
