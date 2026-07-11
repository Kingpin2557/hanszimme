import "./TourDetail.css";
import { useEffect, useState } from "react";
import SoundtrackPlayer from "../SoundtrackPlayer/SoundtrackPlayer";
import { type Tour } from "../../types";
import CountryFlag from "../CountryFlag/CountryFlag";

type PlayerAlbum = { title: string; artist: string; artwork: string | null };
type PlayerTrack = { id: number; title: string; durationMs: number | null };

// Selected tour: trail summary + stop list, plus the Hans Zimmer live album
// player. Tracks are fetched on select (tours aren't part of the route loader).
export default function TourDetail({ tour }: { tour: Tour }) {
  const [album, setAlbum] = useState<PlayerAlbum | null>(
    tour.album
      ? { title: tour.album.title, artist: tour.album.artist, artwork: tour.album.artwork }
      : null,
  );
  const [tracks, setTracks] = useState<PlayerTrack[]>([]);

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

      {album && <SoundtrackPlayer album={album} tracks={tracks} />}

      <ol className="c-tour-detail__stops">
        {tour.stops.map((s, i) => (
          <li key={`${s.date}-${i}`}>
            <span className="c-tour-detail__city">{s.city}</span>
            <span className="c-tour-detail__sub">
              {s.country}
              {s.date ? ` · ${s.date}` : ""}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
