import { useNavigate } from "react-router-dom";
import { type Movie } from "../types";
import { ArrowLeftIcon } from "./icons";

type SidebarHeaderProps = {
  movieSlug?: string;
  selectedMovie?: Movie;
};

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = "none";
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

  // List view keeps the brand: the site logo + title (logo hides if absent).
  return (
    <div className="o-brand">
      <img
        className="o-logo"
        src="/logo.webp"
        alt=""
        aria-hidden="true"
        onError={hideOnError}
      />
      <h1>Hans Zimmer</h1>
    </div>
  );
}

export default SidebarHeader;
