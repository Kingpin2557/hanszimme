import "mapbox-gl/dist/mapbox-gl.css";
import Home from "../views/Home/Home";
import { createBrowserRouter, useRouteError } from "react-router";
import { movieLoader, movieDetailLoader } from "../loaders/loadMovies";
import { ROUTES } from "./routes";
import AppLoader from "../components/AppLoader/AppLoader";

// Shown when a loader throws (e.g. the API can't find the slug) instead of
// React Router's default full-screen crash.
function RouteError() {
  const error = useRouteError() as Error;
  return (
    <div className="o-error">
      <h1>Something went wrong</h1>
      <p>{error?.message ?? "Unknown error"}</p>
      <a href="/">← Back to the map</a>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <Home />,
    loader: movieLoader,
    errorElement: <RouteError />,
    hydrateFallbackElement: <AppLoader />,
  },
  {
    // The slug stays in the URL; the loader fetches the movie by that slug.
    path: ROUTES.MOVIE,
    element: <Home />,
    loader: movieDetailLoader,
    errorElement: <RouteError />,
    hydrateFallbackElement: <AppLoader />,
  },
]);
