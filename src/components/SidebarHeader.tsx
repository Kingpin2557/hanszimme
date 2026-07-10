import { useNavigate } from "react-router-dom";
import { type Movie } from "../types";
import { ArrowLeftIcon } from "./icons";

type SidebarHeaderProps = {
  movieSlug?: string;
  selectedMovie?: Movie;
};

function SidebarHeader({ movieSlug, selectedMovie }: SidebarHeaderProps) {
  const navigate = useNavigate();

  if (movieSlug) {
    return (
      <>
        <h1>{selectedMovie?.title}</h1>
        {/* Return to wherever the user came from (world or a filtered view). */}
        <button onClick={() => navigate(-1)}>
          <ArrowLeftIcon className="c-btn-icon" />
          Back
        </button>
      </>
    );
  }

  // List view always keeps the brand title, even when a country is selected.
  return <h1>Hans Zimmer</h1>;
}

export default SidebarHeader;
