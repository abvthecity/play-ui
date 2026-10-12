/**
 * The geometry and motion of a card stack, with no DOM in it.
 *
 * Everything here is a pure function of numbers, so it is what the node tests
 * reach and what the engine leans on for every frame it plans.
 */

import { clamp, lerp } from "@play-ui/utils";

/** Where a card is and how it looks, as the engine animates it. */
export interface Pose {
  /** Horizontal offset from the card's resting place, in px. */
  readonly x: number;
  /** Vertical offset, in px. */
  readonly y: number;
  /** Rotation, in degrees. */
  readonly r: number;
  /** Scale, 1 at the front. */
  readonly s: number;
  /** Opacity of the card's shade part, 0 at the front. */
  readonly shade: number;
}

/** A damped spring with unit-free parameters, the same shape Motion takes. */
export interface Spring {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
}

/** The numbers `restPose` needs. */
export interface DepthGeometry {
  /** How much smaller each card beneath is, as a fraction. */
  readonly depthScale: number;
  /** How far each card beneath shows below the one above it, in px. */
  readonly depthOffset: number;
  /** How much shade each depth adds, from 0 to 1. */
  readonly depthShade: number;
  /** Resting tilt of the first card beneath, in degrees; each depth after alternates side. */
  readonly depthRotation?: number;
  /** Resting sideways offset of the first card beneath, in px, alternating like the tilt. */
  readonly depthSpread?: number;
  /** The card's height, in px: the drop is worked out from it. */
  readonly cardHeight: number;
}

export function lerpPose(from: Pose, to: Pose, t: number): Pose {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    r: lerp(from.r, to.r, t),
    s: lerp(from.s, to.s, t),
    shade: lerp(from.shade, to.shade, t),
  };
}

/**
 * Where a card rests at a depth: smaller, lower and a little in shadow.
 *
 * The drop is half of what the scale takes off the card's height plus the
 * offset, so the same `depthOffset` shows beneath a phone-sized card and a
 * desktop one.
 */
export function restPose(depth: number, geometry: DepthGeometry): Pose {
  const s = 1 - depth * geometry.depthScale;
  // A loose pile: the first card beneath leans one way, the next the other, a
  // third further out than the first. Flat at the front, always.
  const fan = depth === 0 ? 0 : (depth % 2 === 1 ? 1 : -1) * (1 + (depth - 1) / 3);

  return {
    x: fan * (geometry.depthSpread ?? 0),
    y: depth * ((geometry.cardHeight * geometry.depthScale) / 2 + geometry.depthOffset),
    r: fan * (geometry.depthRotation ?? 0),
    s,
    shade: depth === 0 ? 0 : Math.min(1, depth * geometry.depthShade),
  };
}

/** A card beneath the top one, `t` of the way toward the depth above it. */
export function liftedPose(depth: number, t: number, geometry: DepthGeometry): Pose {
  return lerpPose(restPose(depth, geometry), restPose(depth - 1, geometry), t);
}

export function poseTransform(pose: Pose): string {
  return `translate3d(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px, 0) rotate(${pose.r.toFixed(3)}deg) scale(${pose.s.toFixed(4)})`;
}

/** Half the width a `width` by `height` card covers once turned `rotation` degrees. */
export function halfSpan(width: number, height: number, rotation: number): number {
  const radians = (Math.abs(rotation) * Math.PI) / 180;

  return (width * Math.cos(radians) + height * Math.sin(radians)) / 2;
}

/**
 * Which way a dragged card tilts, from where it was grabbed.
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
export function dragProgress(dx: number, cardWidth: number, threshold: number): number {
  if (cardWidth <= 0 || threshold <= 0) return 0;

  return Math.abs(dx) / (threshold * cardWidth);
}

/**
 * What a release means: 1 to the right, -1 to the left, 0 to spring back.
 *
 * Past the threshold, or flung hard enough the same way; pulling back on the
 * way out cancels it, however far the card went.
 */
export function releaseDirection(
  dx: number,
  vx: number,
  cardWidth: number,
  threshold: number,
  flingVelocity: number,
): -1 | 0 | 1 {
  const far = dragProgress(dx, cardWidth, threshold) >= 1;
  const flung = Math.abs(vx) > flingVelocity && Math.abs(dx) > 12 && vx > 0 === dx > 0;
  const pullingBack = Math.abs(vx) > 0.3 && vx > 0 !== dx > 0;

  if ((far && !pullingBack) || flung) return dx > 0 ? 1 : -1;

  return 0;
}

/** Travel past where a card may go: it moves, but reluctantly. */
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

/** A cycle's whole trip, one sample per millisecond, outward positive. */
export interface CyclePath {
  /** Offsets from the resting place, one per ms. */
  readonly points: readonly number[];
  /** How far out the card turns. */
  readonly apex: number;
  /** The millisecond it turns at. */
  readonly apexAt: number;
}

/**
 * The path a cycled card takes: out just past the stack, and home underneath.
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

/** A spring as the Web Animations API takes it. */
export interface SpringTiming {
  /** Milliseconds from released to at rest. */
  readonly duration: number;
  /** A CSS `linear()` easing that traces the spring's own displacement. */
  readonly easing: string;
}

const timingCache = new Map<string, SpringTiming>();

/**
 * A spring from rest to rest, sampled into a CSS `linear()` easing.
 *
 * At rest means within a hundredth of the distance, which is where the
 * duration ends; the last sample is pinned to 1 so nothing lands short.
 */
export function springTiming(spring: Spring, samples = 40): SpringTiming {
  const key = `${spring.stiffness}/${spring.damping}/${spring.mass}/${samples}`;
  const cached = timingCache.get(key);

  if (cached) return cached;

  const frequency = Math.sqrt(spring.stiffness / spring.mass);
  const ratio = spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
  const damped = frequency * Math.sqrt(Math.max(0, 1 - ratio * ratio));

  const remaining = (seconds: number): number =>
    damped === 0
      ? (1 + frequency * seconds) * Math.exp(-frequency * seconds)
      : Math.exp(-ratio * frequency * seconds) *
        (Math.cos(damped * seconds) + ((ratio * frequency) / damped) * Math.sin(damped * seconds));

  let duration = 1;

  for (let ms = 1; ms <= 2000; ms += 1) {
    if (Math.abs(remaining(ms / 1000)) >= 0.01) duration = ms + 1;
  }

  const points = Array.from({ length: samples + 1 }, (_, index) =>
    index === samples ? "1" : (1 - remaining((duration * (index / samples)) / 1000)).toFixed(4),
  );
  const timing = { duration, easing: `linear(${points.join(", ")})` };

  timingCache.set(key, timing);

  return timing;
}
