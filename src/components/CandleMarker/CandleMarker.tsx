import "./CandleMarker.css";

function CandleMarker() {
  return (
    <div className="c-candle" aria-hidden="true">
      <span className="c-candle__flame"></span>
      <span className="c-candle__body"></span>
    </div>
  );
}

export default CandleMarker;
