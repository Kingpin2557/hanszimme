import { useNavigate, useSearchParams } from "react-router-dom";
import { type Movie } from "../types";

interface DetailProps {
  movie: Movie;
}

function Detail({ movie }: DetailProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const iso = params.get("iso");

  const backPath = iso ? `/?iso=${iso}` : "/";

  return (
    <section className="c-detail">
      <div
        className="c-detail__back"
        onClick={() => navigate(backPath)}
        style={{ cursor: "pointer" }}
      >
        ← Back to List
      </div>

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
