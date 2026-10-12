/** Whether to animate, given the viewer's `prefers-reduced-motion`. */
export type ReducedMotion = "system" | "always" | "never";

/**
 * Whether motion should be cut: always, never, or as the viewer's system asks.
 * Without a `window` (on the server) the system is taken not to ask.
 */
export function prefersReducedMotion(mode: ReducedMotion = "system"): boolean {
  if (mode === "always") return true;
  if (mode === "never") return false;

  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
