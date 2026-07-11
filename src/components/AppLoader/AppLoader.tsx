import "./AppLoader.css";

// Shown by RouterProvider while the initial loader runs, so the first paint is
// a spinner instead of a black gap.
function AppLoader() {
  return (
    <div className="o-loader">
      <div className="o-loader__spinner" />
      <p>Loading Hans Zimmer…</p>
    </div>
  );
}

export default AppLoader;
