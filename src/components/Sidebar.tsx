import { useNavigate } from "react-router-dom";
import MovieCard from "./MovieCard";
import Detail from "./Detail";
import { type Movie } from "../types";
import { slugify } from "../script/utils/slugify";

type SidebarProps = {
  slug?: string;
  movie?: Movie;
  movies: Movie[];
  iso?: string;
  toolbar?: React.ReactNode;
  children?: React.ReactNode;
};

function SidebarContent({
  slug,
  movie,
  movies,
  iso,
  toolbar,
  children,
}: SidebarProps) {
  const navigate = useNavigate();

  const handleMovieClick = (m: Movie) => {
    // Carry the CURRENT view's country (if any) so "back" returns there.
    // From world view (no iso) we stay in world view.
    const query = iso ? `?iso=${iso}` : "";
    navigate(`/${slugify(m.title)}${query}`);
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
