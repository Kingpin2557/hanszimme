import { useNavigate } from "react-router-dom";
import MovieCard from "./MovieCard";
import Detail from "./Detail";
import { type Movie } from "../types";
import { slugify } from "../script/utils/slugify";

type Sidebar = {
  slug?: string;
  movie?: Movie;
  iso: string;
  movies: Movie[];
  search: string;
};

function SidebarContent({ slug, movie, iso, movies }: Sidebar) {
  const navigate = useNavigate();

  if (slug) {
    return movie ? <Detail movie={movie} /> : <p>Movie not found</p>;
  }

  return (
    <>
      {iso && (
        <div
          className="c-sidebar__clear"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          <p>← Show all countries</p>
        </div>
      )}
      {movies.map((movie: Movie) => (
        <div
          key={movie.id}
          className="c-sidebar__card-wrapper"
          onClick={() =>
            navigate(
              `/${slugify(movie.title)}?iso=${movie.origin_country.code.toLowerCase()}`,
            )
          }
          style={{ cursor: "pointer", display: "block" }}
        >
          <MovieCard movie={movie} />
        </div>
      ))}
    </>
  );
}

export default SidebarContent;
