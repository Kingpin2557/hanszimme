import type { Map as MapboxMap } from "mapbox-gl";

// Paint properties that control a layer's opacity, keyed by layer type.
// Mapbox GL JS doesn't expose one generic "opacity" property -- every layer
// type has its own (symbol layers even have two: one for the icon, one for
// the text).
const OPACITY_PROPS: Record<string, string[]> = {
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

const originalOpacity = new Map<string, number | undefined>();

/**
 * Fades every *data* layer of the map's style -- land, water, buildings,
 * labels, basically anything that makes the globe look like "the earth" --
 * in or out, without touching `fog`.
 *
 * This can't be done with a CSS `opacity` on the map's <canvas>: Mapbox
 * paints the globe's surface *and* its atmosphere/star backdrop (`fog`,
 * which is what gives the "galaxy" look -- see `space-color` and
 * `star-intensity` in the style's fog config) into the same canvas in the
 * same draw call, so hiding the canvas hides both together. Fading the
 * style's layers individually through Mapbox's own paint-property API
 * leaves `fog` completely untouched, since fog isn't a layer -- it's a
 * separate rendering pass -- so the atmosphere/stars stay visible while the
 * surface becomes transparent.
 */
export function setEarthVisible(map: MapboxMap, visible: boolean) {
  const layers = map.getStyle()?.layers ?? [];

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
}
