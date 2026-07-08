import type { LoaderFunction } from "react-router";
import { type Movie } from "../types";

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
    embed_link: m.album?.itunesUrl ?? "",
    title: m.album?.title ?? "",
    tracks: "",
  },
});

const fetchMovies = async (path: string = "") => {
  const url = `${import.meta.env.VITE_MOVIE_API}/api/movie${path}`;
  console.log("Fetching from URL:", url); // Debug log

  try {
    const response = await fetch(url);
    console.log("Response status:", response.status); // Debug log

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Response error:", errorText); // Debug log
      throw new Error(
        `Failed to fetch movies: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

export const movieLoader: LoaderFunction = async () => {
  console.log("Movie loader called"); // Debug log
  const data = await fetchMovies();
  console.log("Data received:", data); // Debug log

  const movies = (data.movies as ApiMovie[])
    .filter((m) => m.originCountry)
    .map(toMovie);
  return { type: "movies" as "movies", data: movies };
};

export const movieDetailLoader: LoaderFunction = async ({ params }) => {
  console.log("Movie detail loader called for:", params.movieSlug); // Debug log
  const data = await fetchMovies(`/${params.movieSlug}`);
  return { type: "movie" as "movie", data: toMovie(data as ApiMovie) };
};
