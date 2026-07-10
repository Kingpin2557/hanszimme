import { useNavigate } from "react-router-dom";
import MovieCard from "./MovieCard";
import Detail from "./Detail";
import { type Movie } from "../types";
import { slugify } from "../script/utils/slugify";

type SidebarProps = {
  slug?: string;
  movie?: Movie;
  movies: Movie[];
  toolbar?: React.ReactNode;
  children?: React.ReactNode;
};

function SidebarContent({
  slug,
  movie,
  movies,
  toolbar,
  children,
}: SidebarProps) {
  const navigate = useNavigate();

  const handleMovieClick = (m: Movie) => {
    // Add the movie's own country so the map orients to its marker. The back
    // button uses history to return to wherever the user actually came from.
    const countryCode = m.origin_country.code.toLowerCase();
    navigate(`/${slugify(m.title)}?iso=${countryCode}`);
  };

  return (
    <>
      {children}
      {slug ? (
        movie ? (
          <Detail movie={movie} />
        ) : (
          <p>Movie not found</p>
        )
      ) : (
        <>
          {toolbar}
          <div className="o-scroll o-flex">
            {movies.map((m) => (
              <div
                key={m.id}
                className="c-sidebar__card-wrapper"
                onClick={() => handleMovieClick(m)}
              >
                <MovieCard movie={m} />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
export default SidebarContent;
