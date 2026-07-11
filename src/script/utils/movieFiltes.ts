import { type Movie } from "../../types";

export const hasValidPoster = (movie: Movie): boolean =>
  Boolean(movie.poster_path && !movie.poster_path.includes("null"));

export const matchesCountry = (movie: Movie, isoFilter: string): boolean =>
  !isoFilter || movie.origin_country.code.toLowerCase() === isoFilter;

export const isUnique = (movie: Movie, idx: number, self: Movie[]): boolean =>
  idx === self.findIndex((m) => m.title === movie.title);

export const hasTidalEmbed = (movie: Movie): boolean =>
  Boolean(
    movie.tidal_album?.embed_link && movie.tidal_album.embed_link.trim() !== "",
  );
