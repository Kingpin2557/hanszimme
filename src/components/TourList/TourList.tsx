import "./TourList.css";
import { useSearchParams } from "react-router-dom";
import { type Tour } from "../../types";

// Tours overview list (tours mode, nothing selected). Selecting a tour is a
// navigation, so the header Back button returns here.
export default function TourList({ tours }: { tours: Tour[] }) {
  const [params, setParams] = useSearchParams();

  const select = (id: string) => {
    const p = new URLSearchParams(params);
    p.set("mode", "tours");
    p.set("tour", id);
    setParams(p);
  };

  if (tours.length === 0) {
    return <p className="u-empty">No tours available yet.</p>;
  }

  return (
    <div className="o-scroll o-flex">
      {tours.map((t) => (
        <button key={t.id} type="button" className="c-tour" onClick={() => select(t.id)}>
          <span className="c-tour__name">{t.name}</span>
          <span className="c-tour__meta">
            {t.years} · {t.stopCount} stops · from {t.start.city}
          </span>
        </button>
      ))}
    </div>
  );
}
