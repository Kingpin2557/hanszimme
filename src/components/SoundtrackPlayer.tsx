import { useEffect, useRef, useState } from "react";
import { logAlbumGradient } from "../lib/sampleGradient";
import { PlayIcon, PauseIcon } from "./icons";

type Album = { title: string; artist: string; artwork: string | null };
type Track = { id: number; title: string; durationMs: number | null };

const API = import.meta.env.VITE_MOVIE_API;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

export default function SoundtrackPlayer({ movieId }: { movieId: number }) {
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const activeBandsCount = 16;

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
    if (audioCtxRef.current || !audioRef.current) return;
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audioRef.current);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
  }

  async function selectTrack(track: Track) {
    const audio = audioRef.current;
    if (!audio) return;
    initAudioGraph();

    if (currentId === track.id) {
      audio.paused ? await audio.play() : audio.pause();
      return;
    }
    setCurrentId(track.id);
    audio.src = `${API}/api/preview/${track.id}`;
    await audio.play();
  }

  useEffect(() => {
    fetch(`${API}/api/movie/${movieId}/tracks`)
      .then((res) => res.json())
      .then((data) => {
        setAlbum(data.album);
        setTracks(data.tracks);
      });
  }, [movieId]);

  return (
    <div className="c-player">
      <ul className="c-player__tracks">
        {tracks.map((track) => (
          <li key={track.id}>
            <button onClick={() => selectTrack(track)}>
              {currentId === track.id && isPlaying ? (
                <PauseIcon />
              ) : (
                <PlayIcon />
              )}
              {track.title}
              <span className="c-player__time">
                {formatTime((track.durationMs ?? 0) / 1000)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onPlaying={() => {
          setIsPlaying(true);
          if (album?.artwork) logAlbumGradient(album.artwork);
          analyserRef.current?.connect(audioCtxRef.current!.destination);
          audioCtxRef.current?.resume();
          startLogging();
        }}
        onPause={() => {
          setIsPlaying(false);
          stopLogging();
          analyserRef.current?.disconnect();
        }}
        onEnded={() => {
          const idx = tracks.findIndex((t) => t.id === currentId);
          if (tracks[idx + 1]) selectTrack(tracks[idx + 1]);
        }}
      />
    </div>
  );
}
