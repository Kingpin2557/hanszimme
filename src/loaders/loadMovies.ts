import type { LoaderFunction } from "react-router";
import { type Movie, type Tour } from "../types";

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

// Album + tracks the player needs, loaded alongside the movie so the detail
// page renders complete (no second request popping in afterwards).
export type PlayerAlbum = {
  title: string;
  artist: string;
  artwork: string | null;
};

export type PlayerTrack = {
  id: number;
  title: string;
  durationMs: number | null;
};

export type DetailLoaderData = {
  type: "movie";
  data: Movie;
  album: PlayerAlbum | null;
  tracks: PlayerTrack[];
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
    embed_link: m.album?.itunesUrl ?? "",
    title: m.album?.title ?? "",
    tracks: "",
  },
});

const fetchMovies = async (path: string = "") => {
  const url = `${import.meta.env.VITE_MOVIE_API}/api/movie${path}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch movies: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
};

// Tours come from setlist.fm via our API; degrade gracefully to [] if the tours
// endpoint is unavailable (e.g. no SETLIST_API_KEY yet) so films still load.
const fetchTours = async (): Promise<Tour[]> => {
  try {
    const res = await fetch(`${import.meta.env.VITE_MOVIE_API}/api/tours`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tours ?? []) as Tour[];
  } catch {
    return [];
  }
};

export const movieLoader: LoaderFunction = async () => {
  const [data, tours] = await Promise.all([fetchMovies(), fetchTours()]);
  const movies = (data.movies as ApiMovie[])
    .filter((m) => m.originCountry)
    .map(toMovie);
  return { type: "movies" as "movies", data: movies, tours };
};

export const movieDetailLoader: LoaderFunction = async ({ params }) => {
  const slug = params.movieSlug;

  // Fetch the movie AND its soundtrack tracks in parallel so everything is
  // ready by the time the detail page renders.
  const [movie, soundtrack] = await Promise.all([
    fetchMovies(`/${slug}`),
    fetch(`${import.meta.env.VITE_MOVIE_API}/api/movie/${slug}/tracks`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  return {
    type: "movie" as "movie",
    data: toMovie(movie as ApiMovie),
    album: (soundtrack?.album ?? null) as PlayerAlbum | null,
    tracks: (soundtrack?.tracks ?? []) as PlayerTrack[],
  };
};
