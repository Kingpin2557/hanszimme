import "mapbox-gl/dist/mapbox-gl.css";
import Home from "../views/Home";
import { createBrowserRouter } from "react-router";
import { movieLoader } from "../loaders/loadMovies";

export const router = createBrowserRouter([
  {
    path: "/",
    children: [
      {
        index: true,
        element: <Home />,
        loader: movieLoader,
      },
      {
        path: ":movieSlug",
        element: <Home />,
      },
    ],
  },
]);
