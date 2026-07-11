import "./SoundtrackPlayer.css";
import { useEffect, useRef, useState } from "react";
import { PlayIcon, PauseIcon } from "../icons/icons";

type Album = { title: string; artist: string; artwork: string | null };
type Track = { id: number; title: string; durationMs: number | null; previewUrl: string };

const API = import.meta.env.VITE_MOVIE_API;

interface SoundtrackPlayerProps {
  album: Album | null;
  tracks: Track[];
  gradient?: string[];
}

export default function SoundtrackPlayer({ album, tracks, gradient }: SoundtrackPlayerProps) {
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const tracksRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("is-playing", isPlaying);
    return () => document.documentElement.classList.remove("is-playing");
  }, [isPlaying]);

  useEffect(() => {
    if (!gradient || gradient.length === 0) return;
    const post = () => {
      fetch(`${API}/api/current`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradient }),
      }).catch(() => {});
    };
    post();
    const id = window.setInterval(post, 5000);
    return () => window.clearInterval(id);
  }, [gradient]);

  useEffect(() => {
    if (currentId == null) return;
    const container = tracksRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-track-id="${currentId}"]`);
    if (!container || !el) return;
    const delta = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
    container.scrollTo({ top: container.scrollTop + delta, behavior: "smooth" });
  }, [currentId]);

  const play = (track: Track) => {
    setCurrentId(track.id);
    setIsPlaying(true);
    console.log(`HZAUDIO|${track.previewUrl}`);
  };

  const pause = () => {
    setIsPlaying(false);
    console.log("HZAUDIO|pause");
  };

  const toggle = (track: Track) => {
    if (currentId === track.id && isPlaying) pause();
    else play(track);
  };

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

      <ul className="c-player__tracks" ref={tracksRef}>
        {tracks.map((track) => {
          const isActive = currentId === track.id;
          return (
            <li key={track.id} data-track-id={track.id} data-active={isActive || undefined}>
              <button
                type="button"
                className="c-player__track"
                data-active={isActive || undefined}
                onClick={() => toggle(track)}
              >
                <span className="c-player__icon">
                  {isActive && isPlaying ? (
                    <PauseIcon className="c-btn-icon" />
                  ) : (
                    <PlayIcon className="c-btn-icon" />
                  )}
                </span>
                <span className="c-player__track-title">{track.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
