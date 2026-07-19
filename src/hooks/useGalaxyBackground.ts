import { useEffect, useRef, type RefObject } from "react";
import { type MapRef } from "react-map-gl/mapbox";

/**
 * Captures whatever the map is currently rendering -- the globe *and* its
 * fog/star backdrop together, i.e. "the galaxy" -- as a still image the
 * moment `hidden` becomes true, and applies it as a full-page CSS
 * background sitting behind the map. The globe itself then fades out via
 * the plain `is-playing` CSS opacity rule on `.mapboxgl-canvas` (see
 * App.css), revealing this frozen snapshot underneath -- so the galaxy the
 * visitor was just looking at stays exactly as it was, instead of
 * disappearing along with the earth. Clears the snapshot again once
 * `hidden` goes back to false.
 *
 * Captures fresh every time `hidden` flips true, so it's always the
 * *current* view (whichever country/movie is focused) that gets frozen,
 * not a fixed pre-made image.
 *
 * Needs `preserveDrawingBuffer: true` on the <Map> -- without it, Mapbox
 * clears the canvas's backing buffer after each frame for performance, and
 * `canvas.toDataURL()` reads back a blank image instead of real pixels.
 */
export function useGalaxyBackground(
  mapRef: RefObject<MapRef | null>,
  hidden: boolean,
) {
  const applied = useRef(false);

  useEffect(() => {
    if (!hidden) {
      if (applied.current) {
        document.body.style.backgroundImage = "";
        applied.current = false;
      }
      return;
    }

    const canvas = mapRef.current?.getMap()?.getCanvas();
    if (!canvas) return;

    try {
      const snapshot = canvas.toDataURL("image/png");
      document.body.style.backgroundImage = `url(${snapshot})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundRepeat = "no-repeat";
      applied.current = true;
    } catch {
      // toDataURL can throw (e.g. a tainted canvas) -- fail soft and leave
      // whatever background was already there rather than breaking the
      // rest of the transition.
    }
  }, [mapRef, hidden]);
}
