import {
  hasValidPoster,
  isUnique,
  matchesCountry,
} from "../script/utils/movieFiltes";
import moviesData from "../assets/movies.json";
import MovieCard from "../components/MovieCard";
import { type Movie } from "../types";
import Map, { Marker } from "react-map-gl/mapbox";
function Home() {
  const movies = moviesData as Movie[];
  const queryParams = new URLSearchParams(window.location.search);
  const isoFilter = queryParams.get("iso")?.toLowerCase() ?? "";

  const filteredMovies = movies.filter(
    (movie, index, self) =>
      hasValidPoster(movie) &&
      isUnique(movie, index, self) &&
      matchesCountry(movie, isoFilter),
  );

  const uniqueCountries = filteredMovies.reduce((acc, current) => {
    const exists = acc.find(
      (item) => item.origin_country.code === current.origin_country.code,
    );
    if (!exists) {
      return [...acc, current];
    }
    return acc;
  }, [] as Movie[]);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  return (
    <div className="o-full">
      <Map
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: 3.72,
          latitude: 51.05,
          zoom: 2,
          padding: { top: 0, bottom: 0, left: 0, right: 600 },
        }}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {uniqueCountries.map((movie) => (
          <Marker
            key={movie.origin_country.code}
            longitude={movie.origin_country.coords.lng}
            latitude={movie.origin_country.coords.lat}
            anchor="bottom"
          />
        ))}
        <section className="o-flex o-sidebar">
          {filteredMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </section>
      </Map>
    </div>
  );
}

export default Home;
