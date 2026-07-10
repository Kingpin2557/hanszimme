// Generic labelled dropdown (styled via .c-filter in App.css). Reused for the
// country, genre and rating filters.
export type Option = { value: string; label: string };

type DropdownProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

function Dropdown({ label, value, options, onChange }: DropdownProps) {
  return (
    <label className="c-filter">
      <span className="c-filter__label">{label}</span>
      <div className="c-filter__field">
        <select
          className="c-filter__select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

export default Dropdown;
