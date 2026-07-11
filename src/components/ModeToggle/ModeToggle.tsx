import "./ModeToggle.css";
import { useSearchParams } from "react-router-dom";

export default function ModeToggle() {
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "tours" ? "tours" : "movies";

  const setMode = (next: "movies" | "tours") => {
    const p = new URLSearchParams(params);
    if (next === "tours") {
      p.set("mode", "tours");
      p.delete("iso");
      p.delete("genre");
      p.delete("rating");
    } else {
      p.delete("mode");
      p.delete("tour");
    }
    setParams(p);
  };

  return (
    <div className="c-mode" role="tablist" aria-label="Map mode">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "movies"}
        className="c-mode__btn"
        data-active={mode === "movies" || undefined}
        onClick={() => setMode("movies")}
      >
        Films
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "tours"}
        className="c-mode__btn"
        data-active={mode === "tours" || undefined}
        onClick={() => setMode("tours")}
      >
        Tours
      </button>
    </div>
  );
}
