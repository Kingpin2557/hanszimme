import { useEffect, useRef } from "react";
import { PANEL_WIDTH, PANEL_HEIGHT } from "../constants/panel";

/**
 * Logs the sidepanel's fixed width/height to the console on every view
 * (movie list, detail, tours, tour detail) as `HZPANEL|width,height`, the
 * same `HZ<TAG>|value` bridge format used by HZGRAD and HZAUDIO (both
 * logged in SoundtrackPlayer.tsx). The UE5 kiosk shell's Web Browser
 * Widget binds to OnConsoleMessage and parses that line to spawn a cube
 * matching the panel's on-screen footprint, so the Niagara particles
 * closest to camera can be kept off (or clipped against) the UI area
 * instead of floating over it.
 *
 * The panel's size is fixed by design -- see PANEL_WIDTH/PANEL_HEIGHT in
 * src/constants/panel.ts and the matching --sidebar-width/--sidebar-height
 * CSS variables in src/index.css -- so this logs those constants directly
 * instead of measuring the DOM.
 *
 * `viewKey` should change whenever the visible view changes (movie slug,
 * mode, tour id) so a fresh line gets logged on every navigation, even
 * though the panel element itself never unmounts between views.
 */
export function usePanelDimensions(viewKey: string) {
  const lastLogged = useRef<string | null>(null);

  useEffect(() => {
    if (lastLogged.current === viewKey) return;
    lastLogged.current = viewKey;
    console.log(`HZPANEL|${PANEL_WIDTH},${PANEL_HEIGHT}`);
  }, [viewKey]);
}
