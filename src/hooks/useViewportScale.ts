import { useEffect, useState } from "react";

/**
 * The resolution the fixed-pixel UI (sidebar, candles -- see
 * src/index.css --sidebar-width/--sidebar-height and
 * src/components/CandleMarker/CandleMarker.css) and the map's base zoom
 * levels (see useMapCamera.ts) were designed against.
 *
 * The UE5 kiosk's Web Browser Widget can render at a very different
 * resolution than this -- and it isn't knowable ahead of time, since it can
 * vary across displays/builds -- so nothing in the app should assume its
 * actual render size matches these numbers. Everything authored as a
 * literal pixel size or a literal zoom level gets scaled relative to this
 * reference instead.
 */
export const REFERENCE_WIDTH = 1920;
export const REFERENCE_HEIGHT = 1080;

// Guardrails against degenerate scales on extreme/very small viewports
// (e.g. a tiny dev window) -- keeps the UI usable rather than vanishing or
// ballooning without bound.
const MIN_SCALE = 0.4;
const MAX_SCALE = 4;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const computeScale = () =>
  clamp(
    Math.min(window.innerWidth / REFERENCE_WIDTH, window.innerHeight / REFERENCE_HEIGHT),
    MIN_SCALE,
    MAX_SCALE,
  );

/**
 * Tracks how far the actual viewport is from the reference resolution and
 * publishes it two ways:
 *  - as the returned number, for code that does its own math (map zoom,
 *    the map's centering padding, the HZPANEL bridge to UE5)
 *  - as `--ui-scale` on the root element, so CSS can scale fixed-px UI with
 *    `scale(var(--ui-scale, 1))` -- the browser's own layout won't make
 *    fixed pixel sizes proportional on its own, so this is done by hand.
 *
 * Recomputed on resize (not just on mount) since the kiosk's actual output
 * size isn't known until the Web Browser Widget reports it.
 */
export function useViewportScale(): number {
  const [scale, setScale] = useState(() => (typeof window === "undefined" ? 1 : computeScale()));

  useEffect(() => {
    const update = () => {
      const next = computeScale();
      setScale(next);
      document.documentElement.style.setProperty("--ui-scale", String(next));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return scale;
}

/**
 * A map's zoom is a fixed pixel-per-degree scale that's independent of the
 * container's actual size -- doubling the container at the same zoom just
 * reveals more surrounding area, it doesn't enlarge what's already visible.
 * That's exactly why a globe tuned to fill a normal browser window ends up
 * looking small on a much bigger render target.
 *
 * To keep the globe filling a consistent fraction of the screen at any
 * resolution, zoom has to grow with the viewport: since zoom is a log2
 * scale (each +1 doubles the rendered pixel size), matching a viewport
 * that's `scale` times the reference size takes `log2(scale)` extra zoom.
 */
export function zoomForScale(baseZoom: number, scale: number): number {
  return baseZoom + Math.log2(scale);
}
