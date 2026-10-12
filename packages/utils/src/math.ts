/**
 * `value`, held between `min` and `max`. A bound left out is the furthest safe
 * integer on that side.
 */
export function clamp(
  value: number,
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER,
): number {
  return Math.min(max, Math.max(min, value));
}

/** The point `t` of the way from `from` to `to`: 0 is `from`, 1 is `to`. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
