import { useEffect, type RefObject } from "react";
import { type MapRef } from "react-map-gl/mapbox";
import { setEarthVisible } from "../lib/mapEarthVisibility";

/**
 * Fades the globe's surface layers (the "earth") out while `hidden` is
 * true, and back in when it's false -- see setEarthVisible for why this
 * has to go through Mapbox's layer API instead of a CSS opacity toggle on
 * the map canvas (a CSS toggle would also hide the fog/star backdrop,
 * which needs to stay visible at all times).
 */
export function useEarthVisibility(
  mapRef: RefObject<MapRef | null>,
  hidden: boolean,
) {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const apply = () => setEarthVisible(map, !hidden);
    if (map.isStyleLoaded()) apply();
    else map.once("styledata", apply);
  }, [mapRef, hidden]);
}
