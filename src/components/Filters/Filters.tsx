import "./Filters.css"
import { useSearchParams } from "react-router-dom";
import Dropdown from "../Dropdown/Dropdown";

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

  // Merge one param into the current set (empty clears it) so filters combine.
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  // Clearing the country resets genre + rating back to "All", so an empty
  // selection always shows the default options rather than stale filters.
  const setCountry = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) {
      next.set("iso", value);
    } else {
      next.delete("iso");
      next.delete("genre");
      next.delete("rating");
    }
    setParams(next);
  };

  return (
    <div className="c-filters">
      <Dropdown
        label="Filter by country"
        value={iso}
        onChange={setCountry}
        options={[
          { value: "", label: "All countries" },
          ...countries.map((c) => ({ value: c.code.toLowerCase(), label: c.name })),
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
          ...ratings.map((t) => ({ value: String(t), label: `${t} / 10` })),
        ]}
      />
    </div>
  );
}

export default Filters;
