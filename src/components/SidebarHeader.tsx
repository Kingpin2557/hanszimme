import { useNavigate } from "react-router-dom";
import { type Movie } from "../types";

type SidebarHeaderProps = {
  movieSlug?: string;
  iso: string;
  selectedMovie?: Movie;
};

function SidebarHeader({ movieSlug, iso, selectedMovie }: SidebarHeaderProps) {
  const navigate = useNavigate();

  if (movieSlug) {
    return (
      <>
        <h1>{selectedMovie?.title}</h1>
        <button onClick={() => navigate(iso ? `/?iso=${iso}` : "/")}>
          ← Back
        </button>
      </>
    );
  }

  if (iso) {
    return (
      <>
        <h1>{iso.toUpperCase()}</h1>
        <button onClick={() => navigate("/")}>← World View</button>
      </>
    );
  }

  return <h1>Hans Zimmer</h1>;
}

export default SidebarHeader;
