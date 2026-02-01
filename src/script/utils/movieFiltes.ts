import { type Movie } from "../../types";

// Predicate: Check for valid poster
export const hasValidPoster = (movie: Movie): boolean =>
  Boolean(movie.poster_path && !movie.poster_path.includes("null"));

// Predicate: Match country code
export const matchesCountry = (movie: Movie, isoFilter: string): boolean =>
  !isoFilter || movie.origin_country.code.toLowerCase() === isoFilter;

// Logic for finding duplicates (used inside the main filter)
export const isUnique = (movie: Movie, idx: number, self: Movie[]): boolean =>
  idx === self.findIndex((m) => m.title === movie.title);
