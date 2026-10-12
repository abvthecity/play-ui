/**
 * The outline of a cap drawn across two rows, as the ISO return is: a full
 * top and a narrower foot under its right side, as one L.
 */

export interface TallCapGeometry {
  /** The top's width, in px. */
  readonly width: number;
  /** The whole height, from the top's top to the foot's bottom, in px. */
  readonly height: number;
  /** The foot's width, in px; it sits under the top's right edge. */
  readonly foot: number;
  /** Where the top ends and the step is, from the top, in px. */
  readonly step: number;
  /** The corner radius, in px. The inner corner curves the other way by as much. */
  readonly radius: number;
}

/** A coordinate to two places, so the path stays short. */
function n(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * An SVG path for the L, inset by `inset` px on every side (half a stroke, so
 * a stroke lands inside the shape), and by `bottom` px more along the bottom
 * edges (for a face drawn over a darker base).
 */
export function tallCapPath(geometry: TallCapGeometry, inset = 0, bottom = 0): string {
  const left = inset;
  const top = inset;
  const right = geometry.width - inset;
  const end = geometry.height - inset - bottom;
  const stepY = geometry.step - inset - bottom;
  const footX = geometry.width - geometry.foot + inset;
  const room = Math.min(right - footX, stepY - top, end - stepY) / 2;
  const r = Math.max(0, Math.min(geometry.radius, room));
  // The step is short: its outer corner takes most of it and the inner corner
  // the rest, so the two curves never cross.
  const ledge = Math.max(0, footX - left);
  const outer = Math.min(r, ledge * 0.6);
  const inner = Math.min(r, ledge - outer);

  return [
    `M${n(left + r)},${n(top)}`,
    `H${n(right - r)}`,
    `A${n(r)},${n(r)} 0 0 1 ${n(right)},${n(top + r)}`,
    `V${n(end - r)}`,
    `A${n(r)},${n(r)} 0 0 1 ${n(right - r)},${n(end)}`,
    `H${n(footX + r)}`,
    `A${n(r)},${n(r)} 0 0 1 ${n(footX)},${n(end - r)}`,
    `V${n(stepY + inner)}`,
    // The inner corner, where the foot meets the step, curves inward.
    `A${n(inner)},${n(inner)} 0 0 0 ${n(footX - inner)},${n(stepY)}`,
    `H${n(left + outer)}`,
    `A${n(outer)},${n(outer)} 0 0 1 ${n(left)},${n(stepY - outer)}`,
    `V${n(top + r)}`,
    `A${n(r)},${n(r)} 0 0 1 ${n(left + r)},${n(top)}`,
    "Z",
  ].join(" ");
}
