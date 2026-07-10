import { useSearchParams } from "react-router-dom";
import Dropdown from "./Dropdown";

type FiltersProps = {
  countries: { code: string; name: string }[];
  genres: string[];
};

function Filters({ countries, genres }: FiltersProps) {
  const [params, setParams] = useSearchParams();
  const iso = params.get("iso")?.toLowerCase() ?? "";
  const country = params.get("country")?.toLowerCase() ?? "";
  const genre = params.get("genre") ?? "";
  const minRating = params.get("minRating") ?? "";

  // Merge one param into the current set (empty value clears it).
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  // Country selection is context-aware: in a country VIEW (iso, from a candle)
  // it changes the viewed country; on the main view it's just a filter.
  const setCountry = (value: string) => {
    const next = new URLSearchParams(params);
    if (iso) {
      if (value) next.set("iso", value);
      else next.delete("iso");
      next.delete("country");
    } else {
      if (value) next.set("country", value);
      else next.delete("country");
    }
    setParams(next);
  };

  return (
    <div className="c-filters">
      <Dropdown
        label="Filter by country"
        value={iso || country}
        onChange={setCountry}
        options={[
          { value: "", label: "All countries" },
          ...countries.map((c) => ({
            value: c.code.toLowerCase(),
            label: c.name,
          })),
        ]}
      />

      <Dropdown
        label="Genre"
        value={genre}
        onChange={(v) => setParam("genre", v)}
        options={[
          { value: "", label: "All genres" },
          ...genres.map((g) => ({ value: g, label: g })),
        ]}
      />

      <Dropdown
        label="Minimum rating"
        value={minRating}
        onChange={(v) => setParam("minRating", v)}
        options={[
          { value: "", label: "Any rating" },
          { value: "4", label: "At least 4 / 10" },
          { value: "6", label: "At least 6 / 10" },
          { value: "8", label: "At least 8 / 10" },
        ]}
      />
    </div>
  );
}

export default Filters;
