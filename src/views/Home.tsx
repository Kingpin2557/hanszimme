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
  const iso = params.get("iso")?.toLowerCase() ?? "";
  const genre = params.get("genre") ?? "";
  const minRating = Number(params.get("minRating")) || 0;

  // The loader returns a discriminated { type, data }: the full list on "/",
  // a single movie on "/:movieSlug". Derive both views from it.
  const loaded = useLoaderData() as LoaderData;
  const allMovies = loaded.type === "movies" ? loaded.data : [loaded.data];
  const selectedMovie = loaded.type === "movie" ? loaded.data : undefined;

  // Full country name for the selected iso, for the sidebar header title.
  const countryName = iso
    ? allMovies.find((m) => m.origin_country?.code.toLowerCase() === iso)
        ?.origin_country.name
    : undefined;

  // Poster / soundtrack validity is handled by the backend; here we dedupe and
  // apply the country / genre / rating filters.
  const list = allMovies.filter(
    (m, i, self) =>
      isUnique(m, i, self) &&
      matchesCountry(m, iso) &&
      (!genre || m.genres.includes(genre)) &&
      (!minRating || m.rating.score >= minRating),
  );

  const markers = list.filter(
    (m, i, self) =>
      i ===
      self.findIndex((x) => x.origin_country.code === m.origin_country.code),
  );

  // Options for the filter dropdowns (built without the global Map, which is
  // shadowed by react-map-gl's <Map> import).
  const countryNames: Record<string, string> = {};
  const genreSet = new Set<string>();
  for (const m of allMovies) {
    if (m.origin_country) {
      countryNames[m.origin_country.code] = m.origin_country.name;
    }
    m.genres.forEach((g) => genreSet.add(g));
  }
  const countries = Object.entries(countryNames)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const genres = [...genreSet].sort();

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
            onClick={() =>
              setParams({ iso: m.origin_country.code.toLowerCase() })
            }
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
