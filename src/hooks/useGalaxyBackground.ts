import { useEffect, useRef, type RefObject } from "react";
import { type MapRef } from "react-map-gl/mapbox";
import type { Map as MapboxMap } from "mapbox-gl";

/**
 * Captures a still image of *just* the galaxy/fog backdrop -- with every
 * style layer (land, water, buildings, labels: everything that makes the
 * globe look like "the earth") hidden for the single invisible frame it
 * takes to grab the snapshot -- the moment `hidden` becomes true, and
 * applies it as a full-page CSS background sitting behind the map. The
 * canvas itself then fades out via the plain `is-playing` CSS opacity rule
 * on `.mapboxgl-canvas` (see App.css), revealing this snapshot underneath.
 *
 * Layers have to actually be hidden *before* the capture, not just implied
 * by the canvas's CSS opacity: a canvas snapshot reflects whatever pixels
 * Mapbox really painted, and CSS opacity is a compositor effect applied
 * after the fact -- it doesn't touch those pixels. Capturing without
 * hiding the layers first just freezes an identical picture of the earth
 * instead of the galaxy behind it (this was the bug: the globe "faded" to
 * a still photo of itself, never actually disappearing).
 *
 * Captures fresh every time `hidden` flips true, so it's always the
 * *current* camera position (whichever country/movie is focused) that gets
 * frozen, not a fixed pre-made image. Clears the snapshot again once
 * `hidden` goes back to false.
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

    const map = mapRef.current?.getMap();
    if (!map) return;

    captureGalaxyOnly(map, (snapshot) => {
      if (!snapshot) return;
      document.body.style.backgroundImage = `url(${snapshot})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundRepeat = "no-repeat";
      applied.current = true;
    });
  }, [mapRef, hidden]);
}

/**
 * Hides every style layer, waits for that change to actually be painted
 * (setLayoutProperty alone doesn't repaint synchronously -- it schedules a
 * render for the next frame), captures the now-earth-free canvas, then
 * restores every layer's original visibility. The restore happens
 * immediately since the canvas is about to fade out via CSS anyway, so
 * whatever's underneath doesn't matter until `hidden` goes false again.
 */
function captureGalaxyOnly(
  map: MapboxMap,
  onDone: (snapshot: string | null) => void,
) {
  const layers = map.getStyle()?.layers ?? [];
  const original = new Map<string, "visible" | "none" | undefined>();

  for (const layer of layers) {
    original.set(
      layer.id,
      map.getLayoutProperty(layer.id, "visibility") as
        | "visible"
        | "none"
        | undefined,
    );
    map.setLayoutProperty(layer.id, "visibility", "none");
  }

  const restore = () => {
    for (const layer of layers) {
      map.setLayoutProperty(
        layer.id,
        "visibility",
        original.get(layer.id) ?? "visible",
      );
    }
  };

  map.once("render", () => {
    let snapshot: string | null = null;
    try {
      snapshot = map.getCanvas().toDataURL("image/png");
    } catch {
      // Tainted canvas or similar -- fail soft, leave whatever background
      // was already there.
    }
    restore();
    onDone(snapshot);
  });

  map.triggerRepaint();
}
