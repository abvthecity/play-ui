/**
 * Reading a drag: how fast the pointer left, how far the drag got, and what a
 * release means.
 */

import { clamp } from "@play-ui/utils";

/**
 * Which way a dragged element tilts, from where it was grabbed.
 *
 * Held above its middle it swings like a sign hung from below; held below, the
 * other way. Never flat: a grab dead centre still leans at `floor`.
 */
export function tiltFactor(grabY: number, height: number, floor = 0.35): number {
  if (height <= 0) return 1;

  const factor = clamp((0.5 - grabY / height) * 2.2, -1, 1);

  if (Math.abs(factor) >= floor) return factor;

  return factor < 0 ? -floor : floor;
}

/** How far toward the threshold a drag is: 1 and above is armed. */
export function dragProgress(dx: number, width: number, threshold: number): number {
  if (width <= 0 || threshold <= 0) return 0;

  return Math.abs(dx) / (threshold * width);
}

/**
 * What a release means: 1 to the right, -1 to the left, 0 to spring back.
 *
 * Past the threshold, or flung hard enough the same way; pulling back on the
 * way out cancels it, however far it went.
 */
export function releaseDirection(
  dx: number,
  vx: number,
  width: number,
  threshold: number,
  flingVelocity: number,
): -1 | 0 | 1 {
  const far = dragProgress(dx, width, threshold) >= 1;
  const flung = Math.abs(vx) > flingVelocity && Math.abs(dx) > 12 && vx > 0 === dx > 0;
  const pullingBack = Math.abs(vx) > 0.3 && vx > 0 !== dx > 0;

  if ((far && !pullingBack) || flung) return dx > 0 ? 1 : -1;

  return 0;
}

/** Travel past where an element may go: it moves, but reluctantly. */
export function resist(x: number, exponent = 0.72): number {
  return Math.sign(x) * Math.abs(x) ** exponent;
}

/** A pointer sample, for `releaseVelocity`. */
export interface PointerSample {
  readonly t: number;
  readonly x: number;
  readonly y: number;
}

/** The pointer's velocity over the last `window` ms, in px/ms. */
export function releaseVelocity(
  samples: readonly PointerSample[],
  window = 90,
): { x: number; y: number } {
  const last = samples.at(-1);

  if (!last) return { x: 0, y: 0 };

  let first = last;

  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const sample = samples[index];

    if (!sample || last.t - sample.t > window) break;

    first = sample;
  }

  const dt = last.t - first.t;

  return dt > 0 ? { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt } : { x: 0, y: 0 };
}
