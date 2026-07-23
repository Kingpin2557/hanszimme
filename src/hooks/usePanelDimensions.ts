import { useEffect, useRef } from "react";
import { PANEL_WIDTH, PANEL_HEIGHT } from "../constants/panel";

/**
 * Logs the sidepanel's actual on-screen width/height to the console on
 * every view (movie list, detail, tours, tour detail) as
 * `HZPANEL|width,height`, the same `HZ<TAG>|value` bridge format used by
 * HZGRAD and HZAUDIO (both logged in SoundtrackPlayer.tsx). The UE5 kiosk
 * shell's Web Browser Widget binds to OnConsoleMessage and parses that line
 * to spawn a cube matching the panel's on-screen footprint, so the Niagara
 * particles closest to camera can be kept off (or clipped against) the UI
 * area instead of floating over it.
 *
 * PANEL_WIDTH/PANEL_HEIGHT (src/constants/panel.ts) are reference sizes,
 * not the real footprint -- the panel is visually scaled by
 * `scale(var(--ui-scale))` (see .o-sidebar in App.css), so what's actually
 * on screen is those constants times `scale` (the same number
 * useViewportScale.ts writes to --ui-scale). `scale` isn't knowable ahead
 * of the Web Browser Widget's real render resolution, so this can't just
 * log the constants directly the way it used to.
 *
 * `viewKey` should change whenever the visible view changes (movie slug,
 * mode, tour id) so a fresh line gets logged on every navigation, even
 * though the panel element itself never unmounts between views. Also
 * re-logs whenever `scale` changes (e.g. the widget resizes) so UE5's cube
 * never goes stale.
 */
export function usePanelDimensions(viewKey: string, scale: number) {
  const lastLogged = useRef<string | null>(null);

  useEffect(() => {
    const key = `${viewKey}:${scale.toFixed(4)}`;
    if (lastLogged.current === key) return;
    lastLogged.current = key;
    const width = Math.round(PANEL_WIDTH * scale);
    const height = Math.round(PANEL_HEIGHT * scale);
    console.log(`HZPANEL|${width},${height}`);
  }, [viewKey, scale]);
}
