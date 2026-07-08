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

  // Create WebAudio graph fresh per track activation (avoids “stuck suspended” contexts in embedded browsers)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const rafRef = useRef<number>(0);

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
    // if this causes reflow/unmount in your UE setup, comment it out
    document.documentElement.classList.toggle("is-playing", isPlaying);
    return () => document.documentElement.classList.remove("is-playing");
  }, [isPlaying]);

  function startLogging() {
    cancelAnimationFrame(rafRef.current);

    const analyser = analyserRef.current;
    if (!analyser) return;

    const raw = new Uint8Array(analyser.frequencyBinCount);

    const logFrame = () => {
      analyser.getByteFrequencyData(raw);

      let sum = 0;
      const bands = Array.from(raw, (v) => {
        sum += v;
        return (v / 255).toFixed(3);
      });
      const level = (sum / raw.length / 255).toFixed(3);

      console.log(`HZFFT|${level}|${bands.join(",")}`);
      rafRef.current = requestAnimationFrame(logFrame);
    };

    rafRef.current = requestAnimationFrame(logFrame);
  }

  function stopLogging() {
    cancelAnimationFrame(rafRef.current);
  }

  async function buildAnalyserFresh() {
    // Clean up previous graph/context
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

    // Must be called from the same click path in embedded browsers
    await ctx.resume().catch(() => {});
  }

  async function selectTrack(track: Track) {
    const audio = audioRef.current;
    if (!audio) return;

    // Toggle pause/play for the same track
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

    // Load a new preview
    setCurrentId(track.id);
    setIsPlaying(false);
    stopLogging();
    setDuration(0);
    setCurrentTime(0);

    // Important: set crossOrigin BEFORE setting src
    audio.crossOrigin = "anonymous";
    audio.src = `${API}/api/preview/${track.id}`;
    audio.load();

    // Build analyser graph after setting src (and from the user click path)
    await buildAnalyserFresh();

    // Play immediately; log the failure reason if blocked
    audio
      .play()
      .then(() => {
        // onPlay handler will set isPlaying/startLogging
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
        onPlay={() => {
          setIsPlaying(true);
          startLogging();
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
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      />
    </div>
  );
}
