import { useEffect, useState } from "react";

/**
 * Tracks the `is-playing` class SoundtrackPlayer toggles on <html> (see
 * SoundtrackPlayer.tsx) as React state, via a MutationObserver, instead of
 * lifting playback state up through the component tree or introducing a
 * store -- SoundtrackPlayer already publishes this as a DOM flag for CSS,
 * this just lets other code (e.g. the earth-visibility effect in Home.tsx)
 * read the same flag.
 */
export function useIsPlaying(): boolean {
  const [isPlaying, setIsPlaying] = useState(() =>
    document.documentElement.classList.contains("is-playing"),
  );

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsPlaying(el.classList.contains("is-playing"));
    });
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isPlaying;
}
