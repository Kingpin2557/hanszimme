import "./Detail.css";
import { useLayoutEffect, useRef, useState } from "react";
import { useLoaderData } from "react-router-dom";
import { type Movie } from "../../types";
import { type DetailLoaderData } from "../../loaders/loadMovies";
import CountryFlag from "../CountryFlag/CountryFlag";
import Pill from "../Pill/Pill";
import SoundtrackPlayer from "../SoundtrackPlayer/SoundtrackPlayer";

interface DetailProps {
  movie: Movie;
}

function Detail({ movie }: DetailProps) {

  const { album, tracks } = useLoaderData() as DetailLoaderData;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const overviewRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = overviewRef.current;
    if (!el) return;
    const check = () => setIsTruncated(el.scrollHeight > el.clientHeight + 1);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [movie.overview]);

  return (
    <div className="c-detail">
      <div className="c-detail__header">
        <img src={movie.poster_path} alt={movie.title} width={500} height={750} />
        <div className="c-detail__description">
          <div className="c-detail__meta">
            <CountryFlag code={movie.origin_country.code} />
            <p>
              ★ {movie.rating.score} / 10 ·{" "}
              <a
                href={`https://www.themoviedb.org/movie/${movie.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {movie.rating.votes} votes on TMDB
              </a>
            </p>
          </div>

          <p
            ref={overviewRef}
            className="c-detail__overview"
            data-clickable={isTruncated || undefined}
            title={isTruncated ? "Click to read the full description" : undefined}
            onClick={
              isTruncated ? () => dialogRef.current?.showModal() : undefined
            }
          >
            {movie.overview}
          </p>

          {movie.genres.length > 0 && (
            <div className="c-detail__genres">
              {movie.genres.map((genre) => (
                <Pill key={genre} label={genre} />
              ))}
            </div>
          )}
        </div>
      </div>

      <SoundtrackPlayer album={album} tracks={tracks} />

      {isTruncated && (
        <dialog
          ref={dialogRef}
          className="c-dialog"
          onClick={(e) => {
            if (e.target === dialogRef.current) dialogRef.current?.close();
          }}
        >
          <div className="c-dialog__body">
            <p>{movie.overview}</p>
            <button
              className="c-dialog__close"
              onClick={() => dialogRef.current?.close()}
            >
              Close
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}

export default Detail;
