// A small candle used in place of the default Mapbox pin: a wax body with a
// flickering flame (animation lives in App.css).
function CandleMarker() {
  return (
    <div className="c-candle" aria-hidden="true">
      <span className="c-candle__flame"></span>
      <span className="c-candle__body"></span>
    </div>
  );
}

export default CandleMarker;
