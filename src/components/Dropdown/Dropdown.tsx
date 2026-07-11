import "./Dropdown.css";
import { useEffect, useRef, useState } from "react";

// Custom DOM-only dropdown. A native <select> opens an OS-level popup window,
// which UE5's off-screen CEF browser can't create and crashes on — so the option
// list is rendered as plain DOM instead. Same props as the old select version.
export type Option = { value: string; label: string };

type DropdownProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

function Dropdown({ label, value, options, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  // Close when clicking outside the control or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="c-filter" ref={rootRef}>
      <span className="c-filter__label">{label}</span>
      <div className="c-filter__field" data-open={open || undefined}>
        <button
          type="button"
          className="c-filter__button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {selected?.label ?? ""}
        </button>

        {open && (
          <ul className="c-filter__menu" role="listbox">
            {options.map((o) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                className="c-filter__option"
                data-active={o.value === value || undefined}
                onClick={() => pick(o.value)}
              >
                {o.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dropdown;
