import { useEffect, useRef } from "react";
import { useSearchParams, useParams, useLoaderData } from "react-router-dom";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import { useMapCamera } from "../hooks/useMapCamera";
import SidebarHeader from "../components/SidebarHeader";
import CandleMarker from "../components/CandleMarker";
import Filters from "../components/Filters";

import { isUnique, matchesCountry } from "../script/utils/movieFiltes";
import { type Movie } from "../types";
import { type DetailLoaderData } from "../loaders/loadMovies";
import Sidebar from "../components/Sidebar";

const initialPos = {
  longitude: 3.72,
  latitude: 51.05,
  zoom: 2,
  padding: { top: 0, bottom: 0, left: 0, right: 750 },
};

// Ratings are bucketed to a whole number out of 10 for an exact-match filter.
const roundRating = (score: number) => Math.round(score);

type LoaderData = { type: "movies"; data: Movie[] } | DetailLoaderData;

function Home() {
  const mapRef = useRef<MapRef>(null);
  const { movieSlug } = useParams();
  const [params, setParams] = useSearchParams();

  // `iso` selects a country (dropdown or candle): it zooms the earth and filters
  // the list, but the sidebar header keeps the "Hans Zimmer" brand title.
  const iso = params.get("iso")?.toLowerCase() ?? "";
  const genre = params.get("genre") ?? "";
  const rating = Number(params.get("rating")) || 0; // exact rating out of 10

  // The loader returns a discriminated { type, data }: the full list on "/",
  // a single movie on "/:movieSlug". Derive both views from it.
  const loaded = useLoaderData() as LoaderData;
  const allMovies = loaded.type === "movies" ? loaded.data : [loaded.data];
  const selectedMovie = loaded.type === "movie" ? loaded.data : undefined;

  // De-duplicate once; each filter is applied on top of this.
  const deduped = allMovies.filter((m, i, self) => isUnique(m, i, self));
  const matchesGenre = (m: Movie) => !genre || m.genres.includes(genre);
  const matchesRating = (m: Movie) =>
    !rating || roundRating(m.rating.score) === rating;

  // Sidebar list + markers: all three filters applied.
  const list = deduped.filter(
    (m) => matchesCountry(m, iso) && matchesGenre(m) && matchesRating(m),
  );

  const markers = list.filter(
    (m, i, self) =>
      i ===
      self.findIndex((x) => x.origin_country.code === m.origin_country.code),
  );

  // Each dropdown's options exclude ITS OWN filter but respect the others, so
  // they only ever offer choices that actually have a movie.
  const countryNames: Record<string, string> = {};
  for (const m of deduped) {
    if (m.origin_country && matchesGenre(m) && matchesRating(m)) {
      countryNames[m.origin_country.code] = m.origin_country.name;
    }
  }
  const countries = Object.entries(countryNames)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const genreSet = new Set<string>();
  for (const m of deduped) {
    if (matchesCountry(m, iso) && matchesRating(m)) {
      m.genres.forEach((g) => genreSet.add(g));
    }
  }
  const genres = [...genreSet].sort();

  const ratingSet = new Set<number>();
  for (const m of deduped) {
    if (matchesCountry(m, iso) && matchesGenre(m)) {
      ratingSet.add(roundRating(m.rating.score));
    }
  }
  const ratings = [...ratingSet].sort((a, b) => a - b);

  // When a country has a single movie, auto-select its genre + rating; when
  // switching country, drop any filter that would leave it empty.
  useEffect(() => {
    if (movieSlug || !iso) return;
    const inCountry = deduped.filter((m) => matchesCountry(m, iso));
    const next = new URLSearchParams(params);
    let changed = false;

    if (inCountry.length === 1) {
      const only = inCountry[0];
      const g = only.genres[0] ?? "";
      if (g && genre !== g) {
        next.set("genre", g);
        changed = true;
      }
      const r = roundRating(only.rating.score);
      if (rating !== r) {
        next.set("rating", String(r));
        changed = true;
      }
    } else {
      if (genre && !inCountry.some((m) => m.genres.includes(genre))) {
        next.delete("genre");
        changed = true;
      }
      if (rating && !inCountry.some((m) => roundRating(m.rating.score) === rating)) {
        next.delete("rating");
        changed = true;
      }
    }

    if (changed) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso, movieSlug]);

  useMapCamera(mapRef, iso, markers);

  return (
    <div className="o-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        initialViewState={initialPos}
        mapStyle="mapbox://styles/kingpin2557/cml40g6g1009y01qxeyw7etjg"
        style={{ width: "100%", height: "100%" }}
      >
        {markers.map((m) => (
          <Marker
            key={m.origin_country.code}
            longitude={m.origin_country.coords.lng}
            latitude={m.origin_country.coords.lat}
            anchor="bottom"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set("iso", m.origin_country.code.toLowerCase());
              setParams(next);
            }}
          >
            <CandleMarker />
          </Marker>
        ))}

        <section className="o-sidebar">
          <Sidebar
            slug={movieSlug}
            movie={selectedMovie}
            movies={list}
            toolbar={
              <Filters countries={countries} genres={genres} ratings={ratings} />
            }
          >
            <header className="o-header">
              <SidebarHeader movieSlug={movieSlug} selectedMovie={selectedMovie} />
            </header>
          </Sidebar>
        </section>
      </Map>
    </div>
  );
}

export default Home;
