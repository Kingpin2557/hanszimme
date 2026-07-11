// Route paths in one place so the router never hardcodes strings.
export const ROUTES = {
  HOME: "/",
  MOVIE: ":movieSlug",
} as const;
