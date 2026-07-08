import type { LoaderFunction } from "react-router";
import { type Movie } from "../types";

// The API speaks its own shape (poster / originCountry / album); the app's Movie
// type expects poster_path / origin_country / tidal_album. Normalise it here in
// one place so the components stay untouched.
type ApiMovie = {
  id: number;
  title: string;
  overview: string;
  poster: string | null;
  originCountry: Movie["origin_country"] | null;
  genres: string[] | null;
  rating: Movie["rating"] | null;
  album: { id: number; title: string; itunesUrl: string | null } | null;
};

const toMovie = (m: ApiMovie): Movie => ({
  Name: m.title,
  id: m.id,
  title: m.title,
  overview: m.overview,
  poster_path: m.poster ?? "",
  origin_country: m.originCountry as Movie["origin_country"],
  genres: m.genres ?? [],
  rating: m.rating ?? { score: 0, votes: 0 },
  tidal_album: {
    id: m.album?.id ?? 0,
    // NOTE: the API returns an iTunes album link, not an embeddable player.
    embed_link: m.album?.itunesUrl ?? "",
    title: m.album?.title ?? "",
    tracks: "",
  },
});

// Shared fetch: same logic for the list route and the single-movie route.
const fetchMovies = async (path: string = "") => {
  const response = await fetch(`${import.meta.env.VITE_MOVIE_API}/api/movie${path}`);

  if (!response.ok) {
    throw new Error("Failed to fetch movies");
  }

  return response.json();
};

// Root loader: the full filmography (map markers + sidebar list).
export const movieLoader: LoaderFunction = async () => {
  const data = await fetchMovies();
  const movies = (data.movies as ApiMovie[])
    .filter((m) => m.originCountry)
    .map(toMovie);
  return { type: "movies" as "movies", data: movies };
};

// Same loader, but hits /api/movie/:slug — one movie, resolved from the URL slug.
export const movieDetailLoader: LoaderFunction = async ({ params }) => {
  const data = await fetchMovies(`/${params.movieSlug}`);
  return { type: "movie" as "movie", data: toMovie(data as ApiMovie) };
};
