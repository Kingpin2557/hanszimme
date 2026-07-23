/**
 * The sidepanel's reference size -- single source of truth, kept in sync
 * with --sidebar-width / --sidebar-height in src/index.css, which apply the
 * same numbers to the actual `.o-sidebar` element.
 *
 * These are NOT the panel's actual on-screen size: `.o-sidebar` is visually
 * scaled by `scale(var(--ui-scale))` (see App.css) so it matches whatever
 * resolution the UE5 kiosk's Web Browser Widget actually renders at -- see
 * src/hooks/useViewportScale.ts for why. Anything that needs the panel's
 * real footprint (e.g. usePanelDimensions.ts, reporting it to UE5) must
 * multiply these by that scale factor rather than using them directly.
 */
export const PANEL_WIDTH = 700;
export const PANEL_HEIGHT = 740;
