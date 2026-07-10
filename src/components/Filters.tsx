import { useSearchParams } from "react-router-dom";
import Dropdown from "./Dropdown";

type FiltersProps = {
  countries: { code: string; name: string }[];
  genres: string[];
  ratings: number[];
};

function Filters({ countries, genres, ratings }: FiltersProps) {
  const [params, setParams] = useSearchParams();
  const iso = params.get("iso")?.toLowerCase() ?? "";
  const genre = params.get("genre") ?? "";
  const rating = params.get("rating") ?? "";

  // Merge one param into the current set (empty value clears it) so the filters
  // combine instead of overwriting each other.
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  return (
    <div className="c-filters">
      <Dropdown
        label="Filter by country"
        value={iso}
        onChange={(v) => setParam("iso", v)}
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
        label="Rating"
        value={rating}
        onChange={(v) => setParam("rating", v)}
        options={[
          { value: "", label: "Any rating" },
          ...ratings.map((t) => ({
            value: String(t),
            label: `${t} / 10`,
          })),
        ]}
      />
    </div>
  );
}

export default Filters;
