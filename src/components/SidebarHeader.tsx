import { useNavigate } from "react-router-dom";
import { type Movie } from "../types";
import { ArrowLeftIcon } from "./icons";
import logoUrl from "../assets/logo.webp";
import lampUrl from "../assets/lamp.webp";

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

  // List view: brand (logo + title) on the left, skull lantern on the right.
  // The detail view renders the Back button in that right slot instead, so the
  // lantern only shows while there is no back arrow.
  return (
    <>
      <div className="o-brand">
        <img
          className="o-logo"
          src={logoUrl}
          alt="Hans Zimmer logo"
          width={75}
          height={75}
        />
        <h1>Hans Zimmer</h1>
      </div>
      <img
        className="o-lamp"
        src={lampUrl}
        alt="Skull lantern"
        width={496}
        height={979}
      />
    </>
  );
}

export default SidebarHeader;
