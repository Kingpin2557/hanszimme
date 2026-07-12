import "./SoundtrackPlayer.css";
import { useEffect, useRef, useState } from "react";
import { PlayIcon, PauseIcon } from "../icons/icons";

type Album = { title: string; artist: string; artwork: string | null };
type Track = { id: number; title: string; durationMs: number | null; previewUrl: string };

const FALLBACK_MS = 30000;

const srgbHexToLinear = (hex: string): string => {
  const h = hex.replace("#", "");
  const channel = (offset: number): string => {
    const s = parseInt(h.slice(offset, offset + 2), 16) / 255;
    const lin = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    return lin.toFixed(4);
  };
  return `${channel(0)},${channel(2)},${channel(4)}`;
};

const formatGradient = (colors: string[]): string => colors.map(srgbHexToLinear).join(";");

interface SoundtrackPlayerProps {
  album: Album | null;
  tracks: Track[];
  gradient?: string[];
}

export default function SoundtrackPlayer({ album, tracks, gradient }: SoundtrackPlayerProps) {
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const tracksRef = useRef<HTMLUListElement>(null);
  const stateRef = useRef<{ tracks: Track[]; currentId: number | null }>({ tracks, currentId });
  const isPlayingRef = useRef(isPlaying);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("is-playing", isPlaying);
    return () => document.documentElement.classList.remove("is-playing");
  }, [isPlaying]);

  useEffect(() => {
    if (!gradient || gradient.length === 0) return;
    console.log(`HZGRAD|${formatGradient(gradient)}`);
  }, [gradient]);

  useEffect(() => {
    if (currentId == null) return;
    const container = tracksRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-track-id="${currentId}"]`);
    if (!container || !el) return;
    const delta = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
    container.scrollTo({ top: container.scrollTop + delta, behavior: "smooth" });
  }, [currentId]);

  useEffect(() => {
    stateRef.current = { tracks, currentId };
  }, [tracks, currentId]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (isPlayingRef.current) console.log("HZAUDIO|pause");
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const advance = () => {
    const { tracks: list, currentId: cur } = stateRef.current;
    if (!list.length) return;
    const idx = list.findIndex((t) => t.id === cur);
    const next = list[(idx + 1) % list.length];
    if (next) play(next);
  };

  const arm = (ms: number) => {
    clearTimer();
    timerRef.current = window.setTimeout(advance, ms);
  };

  const play = (track: Track) => {
    clearTimer();
    setCurrentId(track.id);
    setIsPlaying(true);
    console.log(`HZAUDIO|${track.previewUrl}`);

    arm(FALLBACK_MS);

    const probe = new Audio();
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      if (stateRef.current.currentId !== track.id) return;
      const secs = probe.duration;
      if (Number.isFinite(secs) && secs > 0) arm(secs * 1000);
    };
    probe.src = track.previewUrl;
  };

  const pause = () => {
    clearTimer();
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
