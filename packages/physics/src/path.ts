import { clamp } from "@play-ui/utils";

import type { Spring } from "./spring.ts";

/** A thrown element's whole trip out and home, one sample per millisecond, outward positive. */
export interface CyclePath {
  /** Offsets from the resting place, one per ms. */
  readonly points: readonly number[];
  /** How far out the element turns. */
  readonly apex: number;
  /** The millisecond it turns at. */
  readonly apexAt: number;
}

/**
 * The path a thrown element takes: out to `clear`, and home on a spring.
 *
 * Out is a cubic that leaves at the release speed `v0` (px/ms) and arrives at
 * `clear` with no speed left; home is `spring` from that standstill back to 0.
 * The two meet at zero velocity, so the turn has no seam and no pause.
 */
export function cyclePath(
  x0: number,
  v0: number,
  clear: number,
  maxOutMs: number,
  spring: Spring,
): CyclePath {
  const points: number[] = [];
  const velocity = Math.max(0, v0);
  let apex: number;
  let duration: number;

  if (x0 < clear) {
    const distance = clear - x0;

    duration = clamp(velocity > 0.01 ? (2 * distance) / velocity : maxOutMs, 120, maxOutMs);
    // Any faster and the cubic would overshoot `clear` and come back to it.
    if (velocity * duration > 3 * distance) duration = (3 * distance) / velocity;

    apex = clear;
  } else {
    // Already clear: coast a little way and turn.
    duration = 120;
    apex = x0 + velocity * 40;
  }

  duration = Math.max(1, Math.round(duration));

  for (let t = 0; t <= duration; t += 1) {
    const u = t / duration;
    const u2 = u * u;
    const u3 = u2 * u;

    points.push(
      (2 * u3 - 3 * u2 + 1) * x0 +
        (u3 - 2 * u2 + u) * velocity * duration +
        (3 * u2 - 2 * u3) * apex,
    );
  }

  let x = apex;
  let v = 0;

  for (let step = 1; step <= 2500; step += 1) {
    v += (-spring.stiffness * x - spring.damping * v) / spring.mass / 1000;
    x += v / 1000;
    points.push(x);

    if (step > 20 && Math.abs(x) < 0.3 && Math.abs(v) < 6) break;
  }

  return { points, apex, apexAt: duration };
}
