import { useEffect, type RefObject } from "react";
import { type MapRef } from "react-map-gl/mapbox";

const initialPos = { longitude: 3.72, latitude: 51.05, zoom: 2 };

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
      map.flyTo({ center: [initialPos.longitude, initialPos.latitude], zoom: initialPos.zoom });
      return;
    }

    if (points.length === 1) {
      map.flyTo({
        center: [points[0].lng, points[0].lat],
        zoom: 5,
        padding: { top: 0, bottom: 0, left: 0, right: 700 },
        duration: 1500,
      });
      return;
    }

    const lngs = points.map((p) => p.lng);
    const lats = points.map((p) => p.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: { top: 60, bottom: 60, left: 60, right: 650 }, duration: 1500 },
    );

  }, [focusKey]);
}
