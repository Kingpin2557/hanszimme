import { useRef } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import { useMapCamera } from "../hooks/useMapCamera";
import SidebarHeader from "../components/SidebarHeader";

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
  const { movieSlug } = useParams();
  const [params, setParams] = useSearchParams();
  const iso = params.get("iso")?.toLowerCase() ?? "";

  const allMovies = moviesData as Movie[];
  const selectedMovie = allMovies.find((m) => slugify(m.title) === movieSlug);

  const list = allMovies.filter(
    (m, i, self) =>
      hasValidPoster(m) &&
      isUnique(m, i, self) &&
      matchesCountry(m, iso) &&
      hasTidalEmbed(m),
  );

  const markers = list.filter(
    (m, i, self) =>
      i ===
      self.findIndex((x) => x.origin_country.code === m.origin_country.code),
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
        {markers.map((m) => (
          <Marker
            key={m.origin_country.code}
            longitude={m.origin_country.coords.lng}
            latitude={m.origin_country.coords.lat}
            onClick={() =>
              setParams({ iso: m.origin_country.code.toLowerCase() })
            }
          />
        ))}

        <section className="o-sidebar">
          <Sidebar slug={movieSlug} movie={selectedMovie} movies={list}>
            <header className="o-header">
              <SidebarHeader
                movieSlug={movieSlug}
                iso={iso}
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
