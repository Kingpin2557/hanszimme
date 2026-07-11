import "./Pill.css";
// A small rounded label — used to show each movie genre.
function Pill({ label }: { label: string }) {
  return <span className="c-pill">{label}</span>;
}

export default Pill;
