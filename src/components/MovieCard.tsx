import { slugify } from "../script/utils/slugify";
import { type Movie } from "../types";

interface MovieCardProps {
  movie: Movie;
}

function MovieCard({ movie }: MovieCardProps) {
  const flagUrl = `https://flagcdn.com/w640/${movie.origin_country.code.toLowerCase()}.png`;

  const slug = slugify(movie.title);

  return (
    <a href={`/${slug}`} className="c-card">
      <span
        style={{
          backgroundImage: `url(${flagUrl})`,
        }}
      ></span>
      <img src={movie.poster_path} alt={`${movie.title} Poster`} />
      <div className="c-card__info">
        <div className="c-card__description">
          <p>{movie.title}</p>
          <p>{movie.overview}</p>
        </div>
        <p className="c-card__btn">Click for more info...</p>
      </div>
    </a>
  );
}

export default MovieCard;
