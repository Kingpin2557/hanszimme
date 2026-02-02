import { useRef, useEffect } from "react";
import {
  useSearchParams,
  useParams,
  useLocation,
  Link,
} from "react-router-dom";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";

import {
  hasValidPoster,
  isUnique,
  matchesCountry,
} from "../script/utils/movieFiltes";
import moviesData from "../assets/movies.json";
import MovieCard from "../components/MovieCard";
import Detail from "../components/Detail";
import { type Movie } from "../types";
import { slugify } from "../script/utils/slugify";

const INITIAL_POS = {
  longitude: 3.72,
  latitude: 51.05,
  zoom: 2,
  padding: { top: 0, bottom: 0, left: 0, right: 600 },
};

function Home() {
  const mapRef = useRef<MapRef>(null);
  const location = useLocation();
  const { movieSlug } = useParams();
  const [params, setParams] = useSearchParams();
  const iso = params.get("iso")?.toLowerCase() ?? "";

  const allMovies = moviesData as Movie[];
  const selectedMovie = allMovies.find((m) => slugify(m.title) === movieSlug);

  const list = allMovies.filter(
    (m, i, self) =>
      hasValidPoster(m) && isUnique(m, i, self) && matchesCountry(m, iso),
  );

  const markers = list.filter(
    (m, i, self) =>
      i ===
      self.findIndex((x) => x.origin_country.code === m.origin_country.code),
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!iso) {
      map.flyTo({
        center: [INITIAL_POS.longitude, INITIAL_POS.latitude],
        zoom: INITIAL_POS.zoom,
      });
    } else if (markers.length === 1) {
      const { lng, lat } = markers[0].origin_country.coords;
      map.flyTo({ center: [lng, lat], zoom: 5 });
    } else if (markers.length > 1) {
      const lngs = markers.map((m) => m.origin_country.coords.lng);
      const lats = markers.map((m) => m.origin_country.coords.lat);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        {
          padding: { top: 50, bottom: 50, left: 50, right: 650 },
          duration: 1500,
        },
      );
    }
  }, [iso, markers]);

  return (
    <div className="o-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        initialViewState={INITIAL_POS}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: "100%", height: "100%" }}
      >
        {markers.map((m) => (
          <Marker
            key={m.origin_country.code}
            longitude={m.origin_country.coords.lng}
            latitude={m.origin_country.coords.lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setParams({ iso: m.origin_country.code.toLowerCase() });
            }}
          />
        ))}

        <section className="o-flex o-sidebar">
          {movieSlug ? (
            selectedMovie ? (
              <Detail movie={selectedMovie} />
            ) : (
              <p>Not found</p>
            )
          ) : (
            list.map((m) => (
              <Link key={m.id} to={`/${slugify(m.title)}${location.search}`}>
                <MovieCard movie={m} />
              </Link>
            ))
          )}
        </section>
      </Map>
    </div>
  );
}

export default Home;
