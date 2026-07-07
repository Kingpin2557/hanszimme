import type { LoaderFunction } from "react-router";

export const movieLoader: LoaderFunction = async () => {
  const response = await fetch(`${import.meta.env.VITE_MOVIE_API}/api/movie`);

  if (!response.ok) {
    throw new Error("Failed to fetch movies");
  }

  const data = await response.json();
  return { type: "movies" as "movies", data: data.movies };
};
