/**
 * The sidepanel's fixed on-screen size. These are the single source of
 * truth for the panel's dimensions -- keep them in sync with
 * --sidebar-width / --sidebar-height in src/index.css, which apply the same
 * numbers to the actual `.o-sidebar` element.
 *
 * Any component or hook that needs the panel's width/height as numbers
 * (e.g. to report them to an embedding host) should import these constants
 * instead of measuring the DOM -- the size is fixed by design, not derived
 * from content.
 */
export const PANEL_WIDTH = 700;
export const PANEL_HEIGHT = 600;
