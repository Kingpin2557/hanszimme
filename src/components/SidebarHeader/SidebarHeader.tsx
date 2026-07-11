import { useNavigate } from "react-router-dom";
import { type Movie, type Tour } from "../../types";
import { ArrowLeftIcon } from "../icons/icons";
import logoUrl from "../../assets/logo.webp";
import lampUrl from "../../assets/lamp.webp";

type SidebarHeaderProps = {
  movieSlug?: string;
  selectedMovie?: Movie;
  selectedTour?: Tour;
};

function SidebarHeader({ movieSlug, selectedMovie, selectedTour }: SidebarHeaderProps) {
  const navigate = useNavigate();

  // A selected movie (route) or tour (param) both show a title + Back button.
  // navigate(-1) works for both since each selection was a navigation.
  if (movieSlug || selectedTour) {
    return (
      <>
        <h1>{movieSlug ? selectedMovie?.title : selectedTour?.name}</h1>
        <button onClick={() => navigate(-1)}>
          <ArrowLeftIcon className="c-btn-icon" />
          Back
        </button>
      </>
    );
  }

  // List view: brand (logo + title) on the left, skull lantern on the right.
  return (
    <>
      <div className="o-brand">
        <img className="o-logo" src={logoUrl} alt="Hans Zimmer logo" width={75} height={75} />
        <h1>Hans Zimmer</h1>
      </div>
      <img className="o-lamp" src={lampUrl} alt="Skull lantern" width={496} height={979} />
    </>
  );
}

export default SidebarHeader;
