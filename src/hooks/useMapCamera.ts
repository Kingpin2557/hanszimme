import { useEffect, type RefObject } from "react";
import { type MapRef } from "react-map-gl/mapbox";

const initialPos = { longitude: 3.72, latitude: 51.05 };

// The one zoom level used everywhere in the app. The camera only ever
// pans to a new focus point -- it never zooms -- so the whole globe stays
// in view throughout the experience. Matches the original idle-view zoom.
export const EARTH_ZOOM = 2;

type Point = { lng: number; lat: number };

export function useMapCamera(
  mapRef: RefObject<MapRef | null>,
  focusKey: string,
  points: Point[],
) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (points.length === 0) {
      map.flyTo({ center: [initialPos.longitude, initialPos.latitude], zoom: EARTH_ZOOM });
      return;
    }

    if (points.length === 1) {
      map.flyTo({
        center: [points[0].lng, points[0].lat],
        zoom: EARTH_ZOOM,
        padding: { top: 0, bottom: 0, left: 0, right: 700 },
        duration: 1500,
      });
      return;
    }

    // Center on the midpoint of the bounding box -- not a plain average of
    // every point, which would skew toward wherever pins happen to
    // cluster -- so the candles stay evenly framed around the focus point.
    // Always at the fixed EARTH_ZOOM: this replaces the old fitBounds call,
    // which computed its own zoom to fit the bounds and is exactly the kind
    // of zoom change the app no longer does.
    const lngs = points.map((p) => p.lng);
    const lats = points.map((p) => p.lat);
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;

    map.flyTo({
      center: [centerLng, centerLat],
      zoom: EARTH_ZOOM,
      padding: { top: 60, bottom: 60, left: 60, right: 650 },
      duration: 1500,
    });
  }, [focusKey]);
}
