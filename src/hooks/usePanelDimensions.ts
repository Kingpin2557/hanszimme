import { useEffect, useRef, type RefObject } from "react";

export type PanelSize = { width: number; height: number };

/**
 * Measures the sidepanel's natural (unclipped) content size while the
 * reference view (the movie Detail panel) is active, and reports it back
 * so the panel can be locked to one constant width/height for every other
 * view (movie list, tours, tour detail).
 *
 * The size is also written to the console as `HZPANEL|width,height`, the
 * same `HZ<TAG>|value` bridge format used by HZGRAD (see sampleGradient.ts)
 * and HZAUDIO (see SoundtrackPlayer.tsx). The UE5 kiosk shell's Web Browser
 * Widget binds to OnConsoleMessage and parses that line to spawn a cube
 * matching the panel's on-screen footprint, so the Niagara particles
 * closest to camera can be kept off (or clipped against) the UI area
 * instead of floating over it.
 */
export function usePanelDimensions(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onMeasure: (size: PanelSize) => void,
) {
  const lastSize = useRef<PanelSize | null>(null);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const width = el.scrollWidth;
      const height = el.scrollHeight;
      if (!width || !height) return;

      const prev = lastSize.current;
      if (prev && prev.width === width && prev.height === height) return;

      lastSize.current = { width, height };
      onMeasure({ width, height });
      console.log(`HZPANEL|${width},${height}`);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, ref, onMeasure]);
}
