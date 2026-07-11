import { useNavigate } from "react-router-dom";
import MovieCard from "../MovieCard/MovieCard";
import Detail from "../Detail/Detail";
import TourList from "../TourList/TourList";
import TourDetail from "../TourDetail/TourDetail";
import { type Movie, type Tour } from "../../types";
import { slugify } from "../../script/utils/slugify";

type SidebarProps = {
  slug?: string;
  movie?: Movie;
  movies: Movie[];
  mode?: "movies" | "tours";
  tours?: Tour[];
  selectedTour?: Tour;
  toolbar?: React.ReactNode;
  children?: React.ReactNode;
};

function SidebarContent({
  slug,
  movie,
  movies,
  mode = "movies",
  tours = [],
  selectedTour,
  toolbar,
  children,
}: SidebarProps) {
  const navigate = useNavigate();

  const handleMovieClick = (m: Movie) => {
    const countryCode = m.origin_country.code.toLowerCase();
    navigate(`/${slugify(m.title)}?iso=${countryCode}`);
  };

  // A movie detail route always wins (it has its own URL).
  if (slug) {
    return (
      <>
        {children}
        {movie ? <Detail movie={movie} /> : <p>Movie not found</p>}
      </>
    );
  }

  // Tours mode: a selected tour shows its detail, otherwise the tours list.
  if (mode === "tours") {
    return (
      <>
        {children}
        {selectedTour ? (
          <TourDetail tour={selectedTour} />
        ) : (
          <>
            {toolbar}
            <TourList tours={tours} />
          </>
        )}
      </>
    );
  }

  // Movies mode: filters + the movie list.
  return (
    <>
      {children}
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
  );
}
export default SidebarContent;
