import { useSearchParams } from "react-router-dom";

type Country = { code: string; name: string };

function CountryFilter({ countries }: { countries: Country[] }) {
  const [params, setParams] = useSearchParams();
  const iso = params.get("iso")?.toLowerCase() ?? "";

  return (
    <label className="c-filter">
      <span className="c-filter__label">Filter by country</span>
      <div className="c-filter__field">
        <select
          className="c-filter__select"
          value={iso}
          onChange={(e) => {
            const value = e.target.value;
            setParams(value ? { iso: value } : {});
          }}
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code.toLowerCase()}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

export default CountryFilter;
