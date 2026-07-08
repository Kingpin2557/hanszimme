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
    if (!audio) return;

    stopLogging();
    audio.pause();
    audio.src = "";
    audio.load();

    initAudioGraph();

    // Resume audio context on user interaction
    try {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
    } catch (err) {
      console.error("Failed to resume audio context:", err);
    }

    if (currentId === track.id) {
      try {
        await audio.play();
      } catch (err) {
        console.error("Playback failed:", err);
      }
      return;
    }
    setCurrentId(track.id);
    audio.src = `${API}/api/preview/${track.id}`;
    console.log("Audio URL:", `${API}/api/preview/${track.id}`);

    try {
      await audio.play();
    } catch (err) {
      console.error("Playback failed:", err);
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return;
    const bar = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - bar.left) / bar.width) * audio.duration;
  }

  useEffect(() => {
    fetch(`${API}/api/movie/${movieId}/tracks`)
      .then((res) => res.json())
      .then((data) => {
        setAlbum(data.album);
        setTracks(data.tracks);
      });
  }, [movieId]);

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
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlaying={() => {
          setIsPlaying(true);
          if (album?.artwork) logAlbumGradient(album.artwork);

          // Connect to destination and resume context on play
          try {
            if (analyserRef.current && audioCtxRef.current) {
              analyserRef.current.connect(audioCtxRef.current.destination);
              if (audioCtxRef.current.state === "suspended") {
                audioCtxRef.current.resume();
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
          if (tracks[idx + 1]) selectTrack(tracks[idx + 1]);
        }}
        onError={(e) => {
          console.error("Audio error:", e.currentTarget.error);
          setIsPlaying(false);
        }}
      />
    </div>
  );
}
