import { useRef } from "react";
import { useSearchParams, useParams, useLocation } from "react-router-dom";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import { useMapCamera } from "../hooks/useMapCamera";

import {
  hasValidPoster,
  isUnique,
  matchesCountry,
  hasTidalEmbed,
} from "../script/utils/movieFiltes";
import moviesData from "../assets/movies.json";
import { type Movie } from "../types";
import { slugify } from "../script/utils/slugify";
import Sidebar from "../components/Sidebar";

const initialPos = {
  longitude: 3.72,
  latitude: 51.05,
  zoom: 2,
  padding: { top: 0, bottom: 0, left: 0, right: 750 },
};

function Home() {
  const mapRef = useRef<MapRef>(null);
  const location = useLocation();
  const { movieSlug } = useParams();
  const [params, setParams] = useSearchParams();
  const iso = params.get("iso")?.toLowerCase() ?? "";

  const allMovies = moviesData as Movie[];

  const selectedMovie = allMovies.find(
    (movie) => slugify(movie.title) === decodeURIComponent(movieSlug ?? ""),
  );

  const list = allMovies.filter(
    (movie, i, self) =>
      hasValidPoster(movie) &&
      isUnique(movie, i, self) &&
      matchesCountry(movie, iso) &&
      hasTidalEmbed(movie),
  );

  const markers = list.filter(
    (movie, i, self) =>
      i ===
      self.findIndex(
        (x) => x.origin_country.code === movie.origin_country.code,
      ),
  );

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
        {markers.map((movie) => (
          <Marker
            key={movie.origin_country.code}
            longitude={movie.origin_country.coords.lng}
            latitude={movie.origin_country.coords.lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setParams({ iso: movie.origin_country.code.toLowerCase() });
            }}
          />
        ))}

        <section className="o-sidebar">
          <div className="o-flex o-scroll">
            <Sidebar
              slug={movieSlug}
              movie={selectedMovie}
              iso={iso}
              movies={list}
              search={location.search}
            />
          </div>
        </section>
      </Map>
    </div>
  );
}

export default Home;
