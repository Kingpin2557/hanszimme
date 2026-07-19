import "./Home.css";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useParams, useLoaderData } from "react-router-dom";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl/mapbox";
import { useMapCamera } from "../../hooks/useMapCamera";
import { usePanelDimensions } from "../../hooks/usePanelDimensions";
import { useIsPlaying } from "../../hooks/useIsPlaying";
import { useEarthVisibility } from "../../hooks/useEarthVisibility";
import SidebarHeader from "../../components/SidebarHeader/SidebarHeader";
import CandleMarker from "../../components/CandleMarker/CandleMarker";
import Filters from "../../components/Filters/Filters";
import ModeToggle from "../../components/ModeToggle/ModeToggle";

import { isUnique, matchesCountry } from "../../script/utils/movieFiltes";
import { type Movie, type Tour } from "../../types";
import { type DetailLoaderData, fetchTours } from "../../loaders/loadMovies";
import Sidebar from "../../components/Sidebar/Sidebar";

const initialPos = {
  longitude: 3.72,
  latitude: 51.05,
  zoom: 2,
  padding: { top: 0, bottom: 0, left: 0, right: 750 },
};

const antPathDashes = (dash = 3, gap = 4, step = 0.5): number[][] => {
  const seq: number[][] = [];
  for (let t = 0; t <= dash; t += step) seq.push([t, gap, dash - t]);
  for (let t = step; t < gap; t += step) seq.push([0, t, dash, gap - t]);
  return seq;
};

const DASH_SEQUENCE = antPathDashes();

const roundRating = (score: number) => Math.round(score);

type LoaderData =
  | { type: "movies"; data: Movie[] }
  | DetailLoaderData;

function Home() {
  const mapRef = useRef<MapRef>(null);
  const flyTimer = useRef<number | null>(null);
  const [flyIndex, setFlyIndex] = useState<number | null>(null);
  const { movieSlug } = useParams();
  const [params, setParams] = useSearchParams();

  const iso = params.get("iso")?.toLowerCase() ?? "";
  const genre = params.get("genre") ?? "";
  const rating = Number(params.get("rating")) || 0;

  const mode = params.get("mode") === "tours" ? "tours" : "movies";
  const tourId = params.get("tour") ?? "";

  // Reflect the current mode on <html> so App.css can scope the
  // is-playing "earth disappears" effect to movies only -- it must never
  // apply while browsing tours.
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    return () => {
      delete document.documentElement.dataset.mode;
    };
  }, [mode]);

  // Fade the globe's surface out while music plays, movies mode only --
  // never for tours. Markers/candles/stops fade via CSS (see App.css);
  // the globe itself has to go through Mapbox's layer API instead of a
  // CSS opacity toggle on the canvas, so the fog/star backdrop behind it
  // stays visible (see useEarthVisibility / setEarthVisible).
  const isPlaying = useIsPlaying();
  useEarthVisibility(mapRef, isPlaying && mode === "movies");

  const loaded = useLoaderData() as LoaderData;
  const allMovies = loaded.type === "movies" ? loaded.data : [loaded.data];
  const selectedMovie = loaded.type === "movie" ? loaded.data : undefined;

  const [tours, setTours] = useState<Tour[]>([]);
  useEffect(() => {
    let active = true;
    fetchTours()
      .then((t) => active && setTours(t))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const selectedTour = tours.find((t) => t.id === tourId);

  // Log the panel's fixed width/height (from src/constants/panel.ts, the
  // same numbers as --sidebar-width/--sidebar-height in index.css) on every
  // view -- `panelViewKey` changes on navigation so a fresh line gets
  // logged per view even though this component/element never unmounts
  // between views.
  const panelViewKey = `${mode}:${movieSlug ?? ""}:${selectedTour?.id ?? ""}`;
  usePanelDimensions(panelViewKey);

  const deduped = allMovies.filter((m, i, self) => isUnique(m, i, self));
  const matchesGenre = (m: Movie) => !genre || m.genres.includes(genre);
  const matchesRating = (m: Movie) => !rating || roundRating(m.rating.score) === rating;
  const list = deduped.filter(
    (m) => matchesCountry(m, iso) && matchesGenre(m) && matchesRating(m),
  );
  const movieMarkers = list.filter(
    (m, i, self) => i === self.findIndex((x) => x.origin_country.code === m.origin_country.code),
  );

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

  }, [iso, movieSlug, mode]);

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

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || mode !== "tours" || !selectedTour) return;
    let step = 0;
    let raf = 0;
    const animate = (timestamp: number) => {
      const next = Math.floor((timestamp / 50) % DASH_SEQUENCE.length);
      if (next !== step && map.getLayer("tour-trail-flow")) {
        map.setPaintProperty("tour-trail-flow", "line-dasharray", DASH_SEQUENCE[step]);
        step = next;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [mode, selectedTour?.id]);

  useEffect(() => {
    setFlyIndex(null);
    return () => {
      if (flyTimer.current) window.clearTimeout(flyTimer.current);
    };
  }, [selectedTour?.id]);

  const flyThrough = () => {
    const map = mapRef.current;
    if (!map || !selectedTour) return;
    if (flyTimer.current) window.clearTimeout(flyTimer.current);
    const stops = selectedTour.stops;
    let i = 0;
    const step = () => {
      if (i >= stops.length) {
        setFlyIndex(null);
        return;
      }
      setFlyIndex(i);
      const s = stops[i];
      map.flyTo({
        center: [s.coords.lng, s.coords.lat],
        zoom: 5,
        padding: { top: 0, bottom: 0, left: 0, right: 700 },
        duration: 2000,
      });
      i += 1;
      flyTimer.current = window.setTimeout(step, 2400);
    };
    step();
  };

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
              id="tour-trail-bg"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#a178bc", "line-width": 4, "line-opacity": 0.35 }}
            />

            <Layer
              id="tour-trail-flow"
              type="line"
              layout={{ "line-cap": "butt", "line-join": "round" }}
              paint={{ "line-color": "#efe6ff", "line-width": 4, "line-dasharray": [0, 4, 3] }}
            />
          </Source>
        )}

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
                data-current={i === flyIndex || undefined}
                data-dim={(flyIndex !== null && i !== flyIndex) || undefined}
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
            onFlyThrough={flyThrough}
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
