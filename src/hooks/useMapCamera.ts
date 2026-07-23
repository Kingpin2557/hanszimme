import { useEffect, type RefObject } from "react";
import { type MapRef } from "react-map-gl/mapbox";

const initialPos = { longitude: 3.72, latitude: 51.05 };

// Overview zoom used whenever the camera has to frame multiple points at
// once -- the idle globe, or an unselected tour's start pins/full route.
// Matches the original idle-view zoom.
export const EARTH_ZOOM = 2;

// Closer zoom used whenever the camera focuses on a single point: a
// selected country/candle, or one stop at a time during a tour's
// fly-through animation.
export const FOCUS_ZOOM = 4.5;

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
        zoom: FOCUS_ZOOM,
        padding: { top: 0, bottom: 0, left: 0, right: 700 },
        duration: 1500,
      });
      return;
    }

    // Center on the midpoint of the bounding box -- not a plain average of
    // every point, which would skew toward wherever pins happen to
    // cluster -- so the candles stay evenly framed around the focus point.
    // This overview stays at EARTH_ZOOM; zooming in on a single candle
    // happens separately (see FOCUS_ZOOM above) once one is selected or the
    // camera flies stop-to-stop through a tour.
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
