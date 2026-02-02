import { useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";

import {
  hasValidPoster,
  isUnique,
  matchesCountry,
} from "../script/utils/movieFiltes";
import moviesData from "../assets/movies.json";
import MovieCard from "../components/MovieCard";
import { type Movie } from "../types";

const initialPos = {
  longitude: 3.72,
  latitude: 51.05,
  zoom: 2,
  padding: { top: 0, bottom: 0, left: 0, right: 600 },
};

function Home() {
  const mapRef = useRef<MapRef>(null);
  const [params, setParams] = useSearchParams();
  const iso = params.get("iso")?.toLowerCase() ?? "";

  const list = (moviesData as Movie[]).filter(
    (movie, index, self) =>
      hasValidPoster(movie) &&
      isUnique(movie, index, self) &&
      matchesCountry(movie, iso),
  );

  const markers = list.filter(
    (marker, index, self) =>
      index ===
      self.findIndex(
        (x) => x.origin_country.code === marker.origin_country.code,
      ),
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!iso) {
      map.flyTo({
        center: [initialPos.longitude, initialPos.latitude],
        zoom: initialPos.zoom,
      });
    } else if (markers.length === 1) {
      map.flyTo({
        center: [
          markers[0].origin_country.coords.lng,
          markers[0].origin_country.coords.lat,
        ],
        zoom: 5,
      });
    } else if (markers.length > 1) {
      const lngs = markers.map((marker) => marker.origin_country.coords.lng);
      const lats = markers.map((marker) => marker.origin_country.coords.lat);
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
        initialViewState={initialPos}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: "100%", height: "100%" }}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.origin_country.code}
            longitude={marker.origin_country.coords.lng}
            latitude={marker.origin_country.coords.lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setParams({ iso: marker.origin_country.code.toLowerCase() });
            }}
          />
        ))}

        <section className="o-flex o-sidebar">
          {list.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </section>
      </Map>
    </div>
  );
}

export default Home;
