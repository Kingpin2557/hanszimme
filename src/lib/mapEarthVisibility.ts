import type { Map as MapboxMap } from "mapbox-gl";

// mapbox-gl types setPaintProperty/getPaintProperty's property-name
// argument as a huge union of every valid paint property across every
// layer type (not just "string"), so this has to be a real literal type --
// not `string[]` -- for TypeScript to accept it at the call sites below.
type OpacityPaintProperty =
  | "background-opacity"
  | "fill-opacity"
  | "line-opacity"
  | "circle-opacity"
  | "fill-extrusion-opacity"
  | "raster-opacity"
  | "heatmap-opacity"
  | "sky-opacity"
  | "icon-opacity"
  | "text-opacity";

// Paint properties that control a layer's opacity, keyed by layer type.
// Not every layer type has one (e.g. hillshade, model, raster-particle),
// and Mapbox's newer "Standard" style (globe + fog/atmosphere presets)
// leans on some of those less common types for its base terrain -- so
// opacity alone isn't a reliable way to make a layer disappear across an
// unknown style. It's still worth fading where it *is* available (see
// below), just not relied on as the thing that actually hides the layer.
const OPACITY_PROPS: Record<string, OpacityPaintProperty[]> = {
  background: ["background-opacity"],
  fill: ["fill-opacity"],
  line: ["line-opacity"],
  circle: ["circle-opacity"],
  "fill-extrusion": ["fill-extrusion-opacity"],
  raster: ["raster-opacity"],
  heatmap: ["heatmap-opacity"],
  sky: ["sky-opacity"],
  symbol: ["icon-opacity", "text-opacity"],
};

// How long to let the opacity fade play (for the layer types that support
// it) before actually flipping `visibility` to `none`. Matches Mapbox GL
// JS's default paint-property transition duration.
const FADE_MS = 300;

const originalOpacity = new Map<string, number | undefined>();
const originalVisibility = new Map<string, "visible" | "none" | undefined>();
const hideTimers = new WeakMap<MapboxMap, ReturnType<typeof setTimeout>>();

/**
 * Hides or shows every layer of the map's style -- land, water, buildings,
 * labels, basically anything that makes the globe look like "the earth" --
 * without touching `fog`.
 *
 * This can't be done with a CSS `opacity` on the map's <canvas>: Mapbox
 * paints the globe's surface *and* its atmosphere/star backdrop (`fog`,
 * which is what gives the "galaxy" look -- see `space-color` and
 * `star-intensity` in the style's fog config) into the same canvas in the
 * same draw call, so hiding the canvas hides both together.
 *
 * The actual hide/show uses each layer's `visibility` layout property --
 * unlike opacity, *every* layer type supports it, so it can't silently
 * fail to affect a layer type this module doesn't know about. Where a
 * layer also has an opacity paint property, that's faded first purely for
 * a smoother visual transition; `visibility` is what's actually
 * authoritative here. Each layer's *original* visibility is cached and
 * restored on show (rather than forcing "visible") in case the style
 * itself intentionally ships some layers hidden by default.
 */
export function setEarthVisible(map: MapboxMap, visible: boolean) {
  const layers = map.getStyle()?.layers ?? [];
  const existingTimer = hideTimers.get(map);
  if (existingTimer) clearTimeout(existingTimer);

  for (const layer of layers) {
    const props = OPACITY_PROPS[layer.type];
    if (!props) continue;

    for (const prop of props) {
      const key = `${layer.id}:${prop}`;

      if (!visible) {
        if (!originalOpacity.has(key)) {
          originalOpacity.set(
            key,
            map.getPaintProperty(layer.id, prop) as number | undefined,
          );
        }
        map.setPaintProperty(layer.id, prop, 0);
      } else if (originalOpacity.has(key)) {
        map.setPaintProperty(layer.id, prop, originalOpacity.get(key));
        originalOpacity.delete(key);
      }
    }
  }

  if (visible) {
    // Show immediately -- opacity (where it exists) fades back in on top
    // of that. Only touch layers this module actually hid before (tracked
    // in originalVisibility); anything never hidden -- including on the
    // very first call, before any hide has happened yet -- is left exactly
    // as the style defined it, in case it was meant to be hidden by
    // default.
    for (const layer of layers) {
      const key = layer.id;
      if (!originalVisibility.has(key)) continue;
      map.setLayoutProperty(
        layer.id,
        "visibility",
        originalVisibility.get(key) ?? "visible",
      );
      originalVisibility.delete(key);
    }
  } else {
    for (const layer of layers) {
      const key = layer.id;
      if (!originalVisibility.has(key)) {
        originalVisibility.set(
          key,
          map.getLayoutProperty(layer.id, "visibility") as
            | "visible"
            | "none"
            | undefined,
        );
      }
    }

    // Hide only after the fade has had a chance to play, so layers that
    // *do* support opacity still visibly fade rather than popping away
    // the instant `visibility` flips.
    hideTimers.set(
      map,
      setTimeout(() => {
        for (const layer of layers) {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
        hideTimers.delete(map);
      }, FADE_MS),
    );
  }
}
