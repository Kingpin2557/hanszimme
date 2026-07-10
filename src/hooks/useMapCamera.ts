import { useEffect, type RefObject } from "react";
import { type MapRef } from "react-map-gl/mapbox";
import { type Movie } from "../types";

const initialPos = {
  longitude: 3.72,
  latitude: 51.05,
  zoom: 2,
};

export function useMapCamera(
  mapRef: RefObject<MapRef | null>,
  iso: string,
  markers: Movie[],
) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!iso) {
      map.flyTo({
        center: [initialPos.longitude, initialPos.latitude],
        zoom: initialPos.zoom,
      });
    } else if (markers.length === 1) {
      const { lng, lat } = markers[0].origin_country.coords;
      // Offset for the sidebar so the marker stays in front, not hidden behind it.
      map.flyTo({
        center: [lng, lat],
        zoom: 5,
        padding: { top: 0, bottom: 0, left: 0, right: 700 },
        duration: 1500,
      });
    } else if (markers.length > 1) {
      const lngs = markers.map((m) => m.origin_country.coords.lng);
      const lats = markers.map((m) => m.origin_country.coords.lat);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        {
          padding: { top: 50, bottom: 50, left: 50, right: 650 },
          duration: 1500,
        },
      );
    }
  }, [iso, markers, mapRef]);
}
