// Samples a 3–4 colour gradient from the album artwork and logs it ONCE for the
// UE5 Niagara system. Apple's mzstatic artwork (the `artwork` URL returned by
// /api/movie/:id/tracks) is CORS-enabled, so a canvas can read its pixels —
// unlike TMDB posters, which send no CORS headers.
//
// Console format (single line, single string argument, easy to match on):
//   HZGRAD|#rrggbb,#rrggbb,#rrggbb

type RGB = { r: number; g: number; b: number };

const luminance = (c: RGB) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

const distance = (a: RGB, b: RGB) =>
  Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);

const toHex = (c: RGB) =>
  "#" + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("");

// Remember which artworks we've already logged so it only happens once each.
const loggedUrls = new Set<string>();

export function logAlbumGradient(url: string, maxColors = 4): void {
  if (loggedUrls.has(url)) return;
  loggedUrls.add(url);

  const img = new Image();
  img.crossOrigin = "anonymous"; // mzstatic sends Access-Control-Allow-Origin
  img.onerror = () => loggedUrls.delete(url); // let it retry if the load failed

  img.onload = () => {
    try {
      const size = 24; // tiny is plenty for colour sampling
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      // Group pixels into coarse colour buckets and count how common each is.
      const buckets = new Map<string, RGB & { n: number }>();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue; // skip transparent
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const key = `${r >> 5}-${g >> 5}-${b >> 5}`; // 8 levels per channel
        const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        bucket.n += 1;
        buckets.set(key, bucket);
      }

      const ordered = [...buckets.values()]
        .sort((a, b) => b.n - a.n) // most common first
        .map((c) => ({
          r: Math.round(c.r / c.n),
          g: Math.round(c.g / c.n),
          b: Math.round(c.b / c.n),
        }));

      // Keep up to maxColors, skipping colours too similar to ones we kept,
      // so a poster with few real colours yields fewer stops.
      const palette: RGB[] = [];
      for (const color of ordered) {
        if (palette.every((p) => distance(p, color) > 60)) palette.push(color);
        if (palette.length >= maxColors) break;
      }

      // Order dark -> light so the gradient reads as a smooth path.
      palette.sort((a, b) => luminance(a) - luminance(b));

      if (palette.length) {
        console.log(`HZGRAD|${palette.map(toHex).join(",")}`);
      }
    } catch {
      // Canvas tainted (image had no CORS) — skip and allow a retry.
      loggedUrls.delete(url);
    }
  };

  img.src = url;
}
