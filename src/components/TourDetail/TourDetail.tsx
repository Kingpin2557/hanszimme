import "./TourDetail.css";
import { useEffect, useState } from "react";
import SoundtrackPlayer from "../SoundtrackPlayer/SoundtrackPlayer";
import { type Tour } from "../../types";
import CountryFlag from "../CountryFlag/CountryFlag";

type PlayerAlbum = { title: string; artist: string; artwork: string | null };
type PlayerTrack = { id: number; title: string; durationMs: number | null };

type TourDetailProps = {
  tour: Tour;
  onFlyThrough?: () => void;
};

export default function TourDetail({ tour, onFlyThrough }: TourDetailProps) {
  const [album, setAlbum] = useState<PlayerAlbum | null>(
    tour.album
      ? { title: tour.album.title, artist: tour.album.artist, artwork: tour.album.artwork }
      : null,
  );
  const [tracks, setTracks] = useState<PlayerTrack[]>([]);
  const [gradient, setGradient] = useState<string[]>([]);

  useEffect(() => {
    const albumId = tour.album?.id;
    if (!albumId) return;
    let active = true;
    fetch(`${import.meta.env.VITE_MOVIE_API}/api/album/${albumId}/tracks`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d) return;
        if (d.album) setAlbum({ title: d.album.title, artist: d.album.artist, artwork: d.album.artwork });
        setTracks((d.tracks ?? []) as PlayerTrack[]);
        setGradient((d.gradient ?? []) as string[]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [tour.album?.id]);

  const last = tour.stops[tour.stops.length - 1];

  return (
    <div className="c-detail c-tour-detail">
      <div className="c-tour-detail__route">
        <span className="c-tour-detail__place">
          <CountryFlag code={tour.start.code} />
          <span>{tour.start.country}</span>
        </span>
        <span className="c-tour-detail__arrow" aria-hidden="true">→</span>
        <span className="c-tour-detail__place">
          <CountryFlag code={last.code} />
          <span>{last.country}</span>
        </span>
      </div>
      <p className="c-tour-detail__meta">
        {tour.years} · {tour.stopCount} stops · {tour.start.city} → {last.city}
      </p>

      {tour.stops.length > 1 && (
        <button type="button" className="c-tour-detail__fly" onClick={onFlyThrough}>
          ▶ Fly the journey
        </button>
      )}

      {album && <SoundtrackPlayer album={album} tracks={tracks} gradient={gradient} />}
    </div>
  );
}
