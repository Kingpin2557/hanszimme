import CountryFlag from "./CountryFlag";
import { slugify } from "../script/utils/slugify";
import { type Movie } from "../types";
import { Link } from "react-router-dom";

interface MovieCardProps {
  movie: Movie;
}

function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link to={`/${slugify(movie.title)}`} className="c-card">
      <CountryFlag code={movie.origin_country.code} />
      <img src={movie.poster_path} alt={`${movie.title} Poster`} />
      <div className="c-card__info">
        <div className="c-card__description">
          <p>{movie.title}</p>
          <p>{movie.overview}</p>
        </div>
        <p className="c-card__btn">Click for more info...</p>
      </div>
    </Link>
  );
}

export default MovieCard;
