import { useEffect, type RefObject } from "react";
import { type MapRef } from "react-map-gl/mapbox";

const initialPos = { longitude: 3.72, latitude: 51.05 };

// Reference zoom levels, tuned at useViewportScale's reference resolution.
// The camera never changes zoom in response to *what's* selected -- see the
// comments below -- but it does adjust these two numbers for the actual
// render resolution via zoomForScale(), so the globe/candles keep a
// consistent on-screen size regardless of the kiosk's real output size.

// Overview zoom used whenever the camera has to frame multiple points at
// once -- the idle globe, or an unselected tour's start pins/full route.
// Matches the original idle-view zoom.
export const EARTH_ZOOM = 2;

// Closer zoom used whenever the camera focuses on a single point: a
// selected country/candle, or one stop at a time during a tour's
// fly-through animation.
export const FOCUS_ZOOM = 4.5;

type Point = { lng: number; lat: number };

// earthZoom/focusZoom: EARTH_ZOOM/FOCUS_ZOOM above, already adjusted for the
// real viewport via zoomForScale() -- computed once by the caller (Home.tsx)
// so every camera move here and the fly-through in Home.tsx agree.
// scale: the same viewport scale (see useViewportScale.ts), used to size the
// padding that keeps focused points from landing behind the sidebar -- the
// sidebar's actual on-screen width is 700 * scale, not a flat 700.
type CameraZoom = { earthZoom: number; focusZoom: number; scale: number };

export function useMapCamera(
  mapRef: RefObject<MapRef | null>,
  focusKey: string,
  points: Point[],
  { earthZoom, focusZoom, scale }: CameraZoom,
) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (points.length === 0) {
      map.flyTo({ center: [initialPos.longitude, initialPos.latitude], zoom: earthZoom });
      return;
    }

    if (points.length === 1) {
      map.flyTo({
        center: [points[0].lng, points[0].lat],
        zoom: focusZoom,
        padding: { top: 0, bottom: 0, left: 0, right: 700 * scale },
        duration: 1500,
      });
      return;
    }

    // Center on the midpoint of the bounding box -- not a plain average of
    // every point, which would skew toward wherever pins happen to
    // cluster -- so the candles stay evenly framed around the focus point.
    // This overview stays at earthZoom; zooming in on a single candle
    // happens separately (see focusZoom above) once one is selected or the
    // camera flies stop-to-stop through a tour.
    const lngs = points.map((p) => p.lng);
    const lats = points.map((p) => p.lat);
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;

    map.flyTo({
      center: [centerLng, centerLat],
      zoom: earthZoom,
      padding: {
        top: 60 * scale,
        bottom: 60 * scale,
        left: 60 * scale,
        right: 650 * scale,
      },
      duration: 1500,
    });
  }, [focusKey, earthZoom, focusZoom, scale]);
}
