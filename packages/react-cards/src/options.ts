/**
 * Every number the stack moves by, with the defaults the original prototype
 * was tuned to. Flat on purpose: a playground control or an override is one key.
 */

export type SwipeDirection = "left" | "right";

/**
 * What a swipe does to the top card.
 *
 * - `cycle` — it swings out just clear of the stack and tucks back in at the bottom.
 * - `dismiss` — it leaves the screen and the stack.
 * - `none` — the direction is closed: the card resists and springs back.
 */
export type SwipeEffect = "cycle" | "dismiss" | "none";

export type SwipeEffects = Readonly<Record<SwipeDirection, SwipeEffect>>;

export const DEFAULT_SWIPE_EFFECTS: SwipeEffects = { left: "cycle", right: "dismiss" };

/** How a dragged card tilts. */
export type TiltMode = "grab" | "fixed" | "none";

/** Whether to animate, given the viewer's `prefers-reduced-motion`. */
export type ReducedMotion = "system" | "always" | "never";

export interface CardStackOptions {
  // The pile.
  /** How many cards show beneath the top one, the real next card included. */
  maxDepth: number;
  /** How much smaller each card beneath is, as a fraction. */
  depthScale: number;
  /** How far each card beneath shows below the one above it, in px. */
  depthOffset: number;
  /** Opacity each depth adds to a card's `Shade` part, from 0 to 1. */
  depthShade: number;
  /** Resting tilt of the first card beneath, in degrees; deeper cards alternate side. */
  depthRotation: number;
  /** Resting sideways offset of the first card beneath, in px; alternates like the tilt. */
  depthSpread: number;

  // The drag.
  /** Travel that arms a swipe, as a fraction of the card's width. */
  threshold: number;
  /** Release speed that swipes whatever the distance, in px/ms. */
  flingVelocity: number;
  /** Tilt at one card-width of travel, in degrees. */
  maxRotation: number;
  /** `grab` tilts away from where the card was held, `fixed` always one way, `none` never. */
  tilt: TiltMode;
  /** Travel before the gesture picks an axis, in px. */
  axisLockDistance: number;
  /** Whether the cards beneath rise while the top one is dragged. */
  lift: boolean;
  /** Travel for a full rise, in card widths. */
  liftDistance: number;
  /** Scale at the bottom of a tap, 1 for none. */
  pressScale: number;
  /** How much of the pointer's vertical travel a dragged card follows, as a fraction. */
  dragFollowY: number;
  /** How a closed direction resists: travel is raised to this power, 1 for not at all. */
  resistExponent: number;

  // Dismiss.
  /** The longest a dismissed card takes to leave, in ms. */
  dismissDuration: number;
  /** How far past the viewport's edge a dismissed card flies, in px. */
  dismissOvershoot: number;
  /** How far a card dismissed by a button rises as it leaves, in px. */
  dismissLift: number;
  /** A dismissed card's tilt as it leaves, as a multiple of its drag's. */
  dismissRotation: number;

  // Cycle.
  /** Space left between a cycled card and the stack at its turn, in px. */
  cycleGap: number;
  /** The longest a cycled card takes to reach its turn, in ms. */
  cycleOutDuration: number;
  /** Tilt of a card cycled by a button, as a fraction of `maxRotation`. */
  cycleRotation: number;
  cycleStiffness: number;
  cycleDamping: number;

  // Promote: the cards beneath coming forward.
  /** Wait after the top card clears, in ms; negative overlaps the exit. */
  promoteDelay: number;
  /** Extra wait per depth, in ms. */
  promoteStagger: number;
  promoteStiffness: number;
  promoteDamping: number;

  // Snap back after a release that did not swipe.
  snapStiffness: number;
  snapDamping: number;
  snapMass: number;

  // Appear: the cards beneath fanning out of the top one when the stage mounts.
  appear: boolean;
  appearDelay: number;
  appearStagger: number;

  /** Multiplies every duration; 4 is a quarter speed, for tuning. */
  timeScale: number;
  reducedMotion: ReducedMotion;
}

export const DEFAULT_CARD_STACK_OPTIONS: Readonly<CardStackOptions> = {
  maxDepth: 3,
  depthScale: 0.05,
  depthOffset: 10,
  depthShade: 0.2,
  depthRotation: 0,
  depthSpread: 0,

  threshold: 0.32,
  flingVelocity: 0.5,
  maxRotation: 12,
  tilt: "grab",
  axisLockDistance: 6,
  lift: true,
  liftDistance: 1,
  pressScale: 0.97,
  dragFollowY: 0.25,
  resistExponent: 0.72,

  dismissDuration: 280,
  dismissOvershoot: 32,
  dismissLift: 10,
  dismissRotation: 1.5,

  cycleGap: 20,
  cycleOutDuration: 340,
  cycleRotation: 0.6,
  cycleStiffness: 220,
  cycleDamping: 26,

  promoteDelay: 0,
  promoteStagger: 40,
  promoteStiffness: 300,
  promoteDamping: 26,

  snapStiffness: 520,
  snapDamping: 34,
  snapMass: 0.7,

  appear: true,
  appearDelay: 90,
  appearStagger: 45,

  timeScale: 1,
  reducedMotion: "system",
};

export function resolveOptions(options: Partial<CardStackOptions> | undefined): CardStackOptions {
  const resolved: CardStackOptions = { ...DEFAULT_CARD_STACK_OPTIONS };

  if (!options) return resolved;

  // An explicit `undefined` means the default, where a spread would erase it.
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && key in resolved) Reflect.set(resolved, key, value);
  }

  resolved.maxDepth = Math.max(1, Math.round(resolved.maxDepth));
  resolved.timeScale = Math.max(0.01, resolved.timeScale);

  return resolved;
}
