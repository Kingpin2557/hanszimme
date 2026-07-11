import "./Pill.css";

function Pill({ label }: { label: string }) {
  return <span className="c-pill">{label}</span>;
}

export default Pill;
