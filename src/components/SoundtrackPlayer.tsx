import { useEffect, useRef, useState } from "react";
import { logAlbumGradient } from "../lib/sampleGradient";
import { PlayIcon, PauseIcon } from "./icons";

// Shapes returned by GET /api/movie/:id/tracks
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

// mm:ss from seconds.
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

function SoundtrackPlayer({ movieId }: SoundtrackPlayerProps) {
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // seconds into the preview
  const [duration, setDuration] = useState(0); // preview length in seconds

  const audioRef = useRef<HTMLAudioElement>(null);

  // Web Audio nodes — created once, on the first play (needs a user gesture).
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const frameRef = useRef<number>(0);

  // 1. Load this movie's album + preview tracks.
  useEffect(() => {
    fetch(`${API}/api/movie/${movieId}/tracks`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setAlbum(data?.album ?? null);
        setTracks(data?.tracks ?? []);
      })
      .catch(() => setTracks([]));
  }, [movieId]);

  // One-time per album: log a colour gradient sampled from the artwork for UE5.
  useEffect(() => {
    if (album?.artwork) logAlbumGradient(album.artwork);
  }, [album?.artwork]);

  // Stop the log loop when the component unmounts.
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  // While a preview plays, dissolve the globe (see .is-playing in App.css) so
  // the UE5 Niagara visualizer behind this browser widget shows through.
  useEffect(() => {
    document.documentElement.classList.toggle("is-playing", isPlaying);
    return () => document.documentElement.classList.remove("is-playing");
  }, [isPlaying]);

  // 2. Wire <audio> -> AnalyserNode -> speakers. Only once per element.
  function connectAnalyser() {
    const audio = audioRef.current;
    if (!audio || sourceRef.current) return;

    const context = new AudioContext();
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    analyser.fftSize = 64; // -> 32 frequency bands, plenty for Niagara

    source.connect(analyser);
    analyser.connect(context.destination); // keep the sound audible

    contextRef.current = context;
    sourceRef.current = source;
    analyserRef.current = analyser;
  }

  // 3. Headless loop: log the FFT data for the UE5 Niagara system.
  //    One line, ONE string argument, easy to parse in UE:
  //      HZFFT|<level>|<b0,b1,...,bN>
  //    - level : overall loudness, 0..1
  //    - b0..bN: each frequency band, 0..1
  //    Parse in UE: split on "|", then split the bands on ",".
  function logFrame() {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const raw = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(raw);

    let sum = 0;
    const bands = Array.from(raw, (v) => {
      sum += v;
      return (v / 255).toFixed(3); // 0..1
    });
    const level = (sum / raw.length / 255).toFixed(3); // 0..1

    console.log(`HZFFT|${level}|${bands.join(",")}`);

    frameRef.current = requestAnimationFrame(logFrame);
  }

  function startLogging() {
    cancelAnimationFrame(frameRef.current);
    logFrame();
  }

  function stopLogging() {
    cancelAnimationFrame(frameRef.current);
  }

  // 4. Play / pause. Clicking the active track toggles it; another track loads.
  function selectTrack(track: Track) {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentId === track.id) {
      audio.paused ? audio.play() : audio.pause();
      return;
    }

    audio.crossOrigin = "anonymous"; // must be set before src for CORS
    audio.src = `${API}/api/preview/${track.id}`;

    connectAnalyser();
    contextRef.current?.resume(); // browsers start the context suspended
    audio.play().catch(() => {});
    setCurrentId(track.id);
  }

  // Click the seek bar to jump within the current preview.
  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
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
            <img className="c-player__art" src={album.artwork} alt={album.title} />
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
          // Auto-advance to the next track; stop only after the last one.
          const index = tracks.findIndex((t) => t.id === currentId);
          const next = tracks[index + 1];
          if (next) {
            selectTrack(next);
          } else {
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

export default SoundtrackPlayer;
