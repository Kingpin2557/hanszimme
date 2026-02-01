import movieData from "../assets/movies.json";
import { type Movie } from "../types";
import { useParams, Link } from "react-router-dom";
import { slugify } from "../script/utils/slugify";

const movies = movieData as Movie[];

function Detail() {
  const { name } = useParams<{ name: string }>();

  const movie = movies.find((movie) => {
    const slug = slugify(movie.title);

    return slug === name;
  });

  if (!movie) {
    return (
      <main style={{ color: "white", padding: "2rem" }}>
        <h1>Movie not found</h1>
        <Link to="/" style={{ color: "lightblue" }}>
          Back to List
        </Link>
      </main>
    );
  }

  return (
    <section className="c-detail">
      <Link to="/" className="c-detail__back">
        ← Back to List
      </Link>

      <div className="c-detail__header">
        <img src={movie.poster_path} alt={movie.title} />
        <div className="c-detail__description">
          <h2>{movie.title}</h2>
          <p>{movie.overview}</p>
        </div>
      </div>

      {/* Tidal Embed Section */}
      {movie.tidal_album?.embed_link && (
        <div className="c-detail__music-container">
          <iframe
            title={`Tidal Album: ${movie.tidal_album.title}`}
            src={movie.tidal_album.embed_link}
            width="100%"
            height="450"
            frameBorder="0"
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
