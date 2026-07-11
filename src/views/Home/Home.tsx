import "./Home.css";
import { useEffect, useRef } from "react";
import { useSearchParams, useParams, useLoaderData } from "react-router-dom";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl/mapbox";
import { useMapCamera } from "../../hooks/useMapCamera";
import SidebarHeader from "../../components/SidebarHeader/SidebarHeader";
import CandleMarker from "../../components/CandleMarker/CandleMarker";
import Filters from "../../components/Filters/Filters";
import ModeToggle from "../../components/ModeToggle/ModeToggle";

import { isUnique, matchesCountry } from "../../script/utils/movieFiltes";
import { type Movie, type Tour } from "../../types";
import { type DetailLoaderData } from "../../loaders/loadMovies";
import Sidebar from "../../components/Sidebar/Sidebar";

const initialPos = {
  longitude: 3.72,
  latitude: 51.05,
  zoom: 2,
  padding: { top: 0, bottom: 0, left: 0, right: 750 },
};

// Ratings are bucketed to a whole number out of 10 for an exact-match filter.
const roundRating = (score: number) => Math.round(score);

type LoaderData =
  | { type: "movies"; data: Movie[]; tours: Tour[] }
  | DetailLoaderData;

function Home() {
  const mapRef = useRef<MapRef>(null);
  const { movieSlug } = useParams();
  const [params, setParams] = useSearchParams();

  const iso = params.get("iso")?.toLowerCase() ?? "";
  const genre = params.get("genre") ?? "";
  const rating = Number(params.get("rating")) || 0; // exact rating out of 10
  // "movies" shows the filmography; "tours" shows his live tours as trails.
  const mode = params.get("mode") === "tours" ? "tours" : "movies";
  const tourId = params.get("tour") ?? "";

  const loaded = useLoaderData() as LoaderData;
  const allMovies = loaded.type === "movies" ? loaded.data : [loaded.data];
  const selectedMovie = loaded.type === "movie" ? loaded.data : undefined;
  const tours = loaded.type === "movies" ? loaded.tours : [];
  const selectedTour = tours.find((t) => t.id === tourId);

  // ---- Movies: de-dupe then apply the three filters ----
  const deduped = allMovies.filter((m, i, self) => isUnique(m, i, self));
  const matchesGenre = (m: Movie) => !genre || m.genres.includes(genre);
  const matchesRating = (m: Movie) => !rating || roundRating(m.rating.score) === rating;
  const list = deduped.filter(
    (m) => matchesCountry(m, iso) && matchesGenre(m) && matchesRating(m),
  );
  const movieMarkers = list.filter(
    (m, i, self) => i === self.findIndex((x) => x.origin_country.code === m.origin_country.code),
  );

  // Dynamic filter options (each excludes its own filter, respects the others).
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
    if (matchesCountry(m, iso) && matchesRating(m)) m.genres.forEach((g) => genreSet.add(g));
  }
  const genres = [...genreSet].sort();

  const ratingSet = new Set<number>();
  for (const m of deduped) {
    if (matchesCountry(m, iso) && matchesGenre(m)) ratingSet.add(roundRating(m.rating.score));
  }
  const ratings = [...ratingSet].sort((a, b) => a - b);

  // Country with a single movie auto-selects its genre + rating; switching
  // country drops a filter that would leave it empty. (Movies mode only.)
  useEffect(() => {
    if (movieSlug || mode === "tours" || !iso) return;
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
  }, [iso, movieSlug, mode]);

  // ---- Camera focus: films by country, tours by start, a tour by its stops ----
  let points: { lng: number; lat: number }[];
  let focusKey: string;
  if (mode === "tours") {
    if (selectedTour) {
      points = selectedTour.stops.map((s) => s.coords);
      focusKey = `tour:${selectedTour.id}`;
    } else {
      points = tours.map((t) => t.start.coords);
      focusKey = "tours";
    }
  } else {
    points = movieMarkers.map((m) => m.origin_country.coords);
    focusKey = `movies:${iso}:${points.length}`;
  }
  useMapCamera(mapRef, focusKey, points);

  const toolbar = (
    <div className="c-toolbar">
      <ModeToggle />
      {mode === "movies" && (
        <Filters countries={countries} genres={genres} ratings={ratings} />
      )}
    </div>
  );

  return (
    <div className="o-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        initialViewState={initialPos}
        mapStyle="mapbox://styles/kingpin2557/cml40g6g1009y01qxeyw7etjg"
        style={{ width: "100%", height: "100%" }}
      >
        {/* A selected tour draws a trail through its stops, in date order. */}
        {mode === "tours" && selectedTour && (
          <Source
            id="tour-trail"
            type="geojson"
            data={{
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: selectedTour.stops.map((s) => [s.coords.lng, s.coords.lat]),
              },
            }}
          >
            <Layer
              id="tour-trail-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#a178bc", "line-width": 2.5, "line-opacity": 0.9 }}
            />
            {/* Repeating arrows along the line show the travel direction. */}
            <Layer
              id="tour-trail-arrows"
              type="symbol"
              layout={{
                "symbol-placement": "line",
                "symbol-spacing": 90,
                "text-field": "▶",
                "text-size": 13,
                "text-keep-upright": false,
                "text-allow-overlap": true,
              }}
              paint={{
                "text-color": "#a178bc",
                "text-halo-color": "#000000",
                "text-halo-width": 1,
              }}
            />
          </Source>
        )}

        {/* Film country candles */}
        {mode === "movies" &&
          movieMarkers.map((m) => (
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

        {/* Tours overview: one candle at each tour's start city */}
        {mode === "tours" &&
          !selectedTour &&
          tours.map((t) => (
            <Marker
              key={t.id}
              longitude={t.start.coords.lng}
              latitude={t.start.coords.lat}
              anchor="bottom"
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set("mode", "tours");
                next.set("tour", t.id);
                setParams(next);
              }}
            >
              <CandleMarker />
            </Marker>
          ))}

        {/* Selected tour: a candle at every stop along the trail */}
        {mode === "tours" &&
          selectedTour &&
          selectedTour.stops.map((s, i) => (
            <Marker
              key={`${s.date}-${i}`}
              longitude={s.coords.lng}
              latitude={s.coords.lat}
              anchor="bottom"
            >
              <div
                className="c-stop"
                data-endpoint={
                  i === 0
                    ? "start"
                    : i === selectedTour.stops.length - 1
                      ? "end"
                      : undefined
                }
              >
                <span className="c-stop__no">{i + 1}</span>
                <CandleMarker />
              </div>
            </Marker>
          ))}

        <section className="o-sidebar">
          <Sidebar
            slug={movieSlug}
            movie={selectedMovie}
            movies={list}
            mode={mode}
            tours={tours}
            selectedTour={selectedTour}
            toolbar={toolbar}
          >
            <header className="o-header">
              <SidebarHeader
                movieSlug={movieSlug}
                selectedMovie={selectedMovie}
                selectedTour={selectedTour}
              />
            </header>
          </Sidebar>
        </section>
      </Map>
    </div>
  );
}

export default Home;
