/**
 * Where a floating stack can be docked along the foot of the page, with no DOM
 * in it.
 *
 * Three places, a third of the viewport each: the pile goes wherever the
 * pointer lets go of it. Pure so the node tests reach it and the hook only
 * asks it questions.
 */

/** The three places along the bottom edge a docked stack can rest. */
export type DockPosition = "left" | "center" | "right";

export const DOCK_POSITIONS: readonly DockPosition[] = ["left", "center", "right"];

export function isDockPosition(value: unknown): value is DockPosition {
  return value === "left" || value === "center" || value === "right";
}

/** The dock under a pointer at `x`, in a viewport `width` wide: whichever third it is in. */
export function dockAt(x: number, width: number): DockPosition {
  if (width <= 0) return "center";
  if (x < width / 3) return "left";
  if (x >= (width * 2) / 3) return "right";

  return "center";
}

/** One step along the edge, stopping at either end: the arrow keys' move. */
export function stepDock(from: DockPosition, step: -1 | 1): DockPosition {
  const index = DOCK_POSITIONS.indexOf(from) + step;

  return DOCK_POSITIONS[Math.min(DOCK_POSITIONS.length - 1, Math.max(0, index))] ?? from;
}

/*
 * Tucking: the stack flung or dragged past a side edge hides there with a
 * sliver left on screen, and a press on the sliver (or a pull) brings it back.
 * A tucked stack is a fourth and fifth place, so a consumer that remembers the
 * dock remembers the tuck with it.
 */

/** The side edge a tucked stack hides behind. */
export type TuckSide = "left" | "right";

/** A dock along the foot, or tucked behind a side edge. */
export type DockPlace = DockPosition | "tucked-left" | "tucked-right";

export function isDockPlace(value: unknown): value is DockPlace {
  return isDockPosition(value) || value === "tucked-left" || value === "tucked-right";
}

/** The edge a place is tucked behind, or null when it is docked. */
export function tuckedSide(place: DockPlace): TuckSide | null {
  if (place === "tucked-left") return "left";
  if (place === "tucked-right") return "right";

  return null;
}

/** Where a tucked stack comes back to: the dock on its own side. A docked one stays put. */
export function untuck(place: DockPlace): DockPosition {
  if (place === "tucked-left") return "left";
  if (place === "tucked-right") return "right";

  return place;
}

/** The share of the stack that must be past an edge when it is let go for it to tuck. */
export const TUCK_OVERHANG = 0.35;

/** A throw toward a side edge this fast (px/ms), let go in that side's third, tucks. */
export const TUCK_FLING = 1.1;

export interface Release {
  /** The pointer, from the area's left edge. */
  x: number;
  /** The pointer's horizontal velocity at release, in px/ms. */
  vx: number;
  /** The stack's own left and right edges where it was let go, from the area's left edge. */
  left: number;
  right: number;
  /** The area's width. */
  width: number;
}

/**
 * Where a let-go stack lands when it can be tucked: behind a side edge if it
 * was dragged a good way past it or thrown at it, otherwise the dock under the
 * pointer.
 */
export function releasePlace({ x, vx, left, right, width }: Release): DockPlace {
  const size = right - left;

  if (width <= 0 || size <= 0) return dockAt(x, width);
  if (-left / size >= TUCK_OVERHANG) return "tucked-left";
  if ((right - width) / size >= TUCK_OVERHANG) return "tucked-right";

  const dock = dockAt(x, width);

  if (vx <= -TUCK_FLING && dock === "left") return "tucked-left";
  if (vx >= TUCK_FLING && dock === "right") return "tucked-right";

  return dock;
}

/**
 * The arrow keys' move for a stack that can be tucked: a tucked one comes back
 * one step inward and goes no further out; a docked one steps as `stepDock`.
 * The keys never tuck: that is a gesture, and the sliver is always one press
 * from back.
 */
export function stepPlace(from: DockPlace, step: -1 | 1): DockPlace {
  if (from === "tucked-left") return step === 1 ? "left" : from;
  if (from === "tucked-right") return step === -1 ? "right" : from;

  return stepDock(from, step);
}
