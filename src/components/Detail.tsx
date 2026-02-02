import { type Movie } from "../types";
import { Link, useLocation } from "react-router-dom"; // New friends!

interface DetailProps {
  movie: Movie;
}

function Detail({ movie }: DetailProps) {
  const location = useLocation(); // This holds the "?iso=..." part

  return (
    <section className="c-detail">
      {/* This link goes back but KEEPS the country filter active! */}
      <Link to={`/${location.search}`} className="c-detail__back">
        ← Back to List
      </Link>

      <div className="c-detail__header">
        <img src={movie.poster_path} alt={movie.title} />
        <div className="c-detail__description">
          <h2>{movie.title}</h2>
          <p>{movie.overview}</p>
        </div>
      </div>

      {movie.tidal_album?.embed_link && (
        <div className="c-detail__music-container">
          <iframe
            title={`Tidal Album: ${movie.tidal_album.title}`}
            src={movie.tidal_album.embed_link}
            width="100%"
            height="450"
            allow="encrypted-media"
            className="c-detail__iframe"
          ></iframe>
          <div className="c-detail__iframe-shield"></div>
        </div>
      )}
    </section>
  );
}

export default Detail;
