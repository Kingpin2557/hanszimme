import { useRef } from "react";
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

type LoaderData = { type: "movies"; data: Movie[] } | DetailLoaderData;

function Home() {
  const mapRef = useRef<MapRef>(null);
  const { movieSlug } = useParams();
  const [params, setParams] = useSearchParams();

  // `iso`     = a country VIEW, entered by clicking a candle (zooms + chrome).
  // `country` = the dropdown FILTER, which stays on the main world view.
  const iso = params.get("iso")?.toLowerCase() ?? "";
  const country = params.get("country")?.toLowerCase() ?? "";
  const genre = params.get("genre") ?? "";
  const minRating = Number(params.get("minRating")) || 0;
  const activeCountry = iso || country;

  // The loader returns a discriminated { type, data }: the full list on "/",
  // a single movie on "/:movieSlug". Derive both views from it.
  const loaded = useLoaderData() as LoaderData;
  const allMovies = loaded.type === "movies" ? loaded.data : [loaded.data];
  const selectedMovie = loaded.type === "movie" ? loaded.data : undefined;

  // Country-view header title comes from `iso` only (candle click).
  const countryName = iso
    ? allMovies.find((m) => m.origin_country?.code.toLowerCase() === iso)
        ?.origin_country.name
    : undefined;

  // Base set: deduped + genre/rating (no country). Drives the country options.
  const baseList = allMovies.filter(
    (m, i, self) =>
      isUnique(m, i, self) &&
      (!genre || m.genres.includes(genre)) &&
      (!minRating || m.rating.score >= minRating),
  );

  // Sidebar list + markers are additionally narrowed to the active country.
  const list = baseList.filter((m) => matchesCountry(m, activeCountry));

  const markers = list.filter(
    (m, i, self) =>
      i ===
      self.findIndex((x) => x.origin_country.code === m.origin_country.code),
  );

  // Country options: every country present for the current genre/rating (so the
  // dropdown lets you switch between them and never offers an empty one).
  const countryNames: Record<string, string> = {};
  for (const m of baseList) {
    if (m.origin_country) {
      countryNames[m.origin_country.code] = m.origin_country.name;
    }
  }
  const countries = Object.entries(countryNames)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Genres from the full catalogue so the genre filter always lists all.
  const genreSet = new Set<string>();
  for (const m of allMovies) m.genres.forEach((g) => genreSet.add(g));
  const genres = [...genreSet].sort();

  // Camera only flies for a country VIEW (candle); the dropdown keeps world view.
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
              // Clicking a candle enters that country's VIEW (keep genre/rating).
              const next = new URLSearchParams(params);
              next.set("iso", m.origin_country.code.toLowerCase());
              next.delete("country");
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
            toolbar={<Filters countries={countries} genres={genres} />}
          >
            <header className="o-header">
              <SidebarHeader
                movieSlug={movieSlug}
                iso={iso}
                countryName={countryName}
                selectedMovie={selectedMovie}
              />
            </header>
          </Sidebar>
        </section>
      </Map>
    </div>
  );
}

export default Home;
