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
  onTourPlayingChange?: (isPlaying: boolean) => void;
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
  onTourPlayingChange,
  toolbar,
  children,
}: SidebarProps) {
  const navigate = useNavigate();

  const handleMovieClick = (m: Movie) => {
    const countryCode = m.origin_country.code.toLowerCase();
    navigate(`/${slugify(m.title)}?iso=${countryCode}`);
  };

  if (slug) {
    return (
      <>
        {children}
        {movie ? <Detail movie={movie} /> : <p>Movie not found</p>}
      </>
    );
  }

  if (mode === "tours") {
    return (
      <>
        {children}
        {selectedTour ? (
          <TourDetail tour={selectedTour} onPlayingChange={onTourPlayingChange} />
        ) : (
          <>
            {toolbar}
            <TourList tours={tours} />
          </>
        )}
      </>
    );
  }

  return (
    <>
      {children}
      {toolbar}
      <div className="o-scroll o-flex o-scroll--movies">
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
