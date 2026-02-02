import "./App.css";
import "mapbox-gl/dist/mapbox-gl.css";
import Home from "./views/Home";
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:movieSlug?" element={<Home />} />
    </Routes>
  );
}

export default App;
