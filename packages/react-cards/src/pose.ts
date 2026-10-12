/**
 * Where each card of a stack rests, with no DOM in it.
 *
 * The motion math (springs, velocity, release) is `@play-ui/physics`; this is
 * the card stack's own geometry on top of it.
 */

import { lerp } from "@play-ui/utils";

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
