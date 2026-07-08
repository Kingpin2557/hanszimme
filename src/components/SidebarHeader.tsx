import { useNavigate } from "react-router-dom";
import { type Movie } from "../types";
import { ArrowLeftIcon } from "./icons";

type SidebarHeaderProps = {
  movieSlug?: string;
  iso: string;
  countryName?: string;
  selectedMovie?: Movie;
};

function SidebarHeader({
  movieSlug,
  iso,
  countryName,
  selectedMovie,
}: SidebarHeaderProps) {
  const navigate = useNavigate();

  if (movieSlug) {
    return (
      <>
        <h1>{selectedMovie?.title}</h1>
        <button onClick={() => navigate(iso ? `/?iso=${iso}` : "/")}>
          <ArrowLeftIcon className="c-btn-icon" />
          Back
        </button>
      </>
    );
  }

  if (iso) {
    return (
      <>
        <h1>{countryName ?? iso.toUpperCase()}</h1>
        <button onClick={() => navigate("/")}>
          <ArrowLeftIcon className="c-btn-icon" />
          World View
        </button>
      </>
    );
  }

  return <h1>Hans Zimmer</h1>;
}

export default SidebarHeader;
