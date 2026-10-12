/**
 * The deck's motion as pure functions: the geometry of a deal, the springs it
 * runs on and the order a put-away runs in. Nothing here touches the DOM, so
 * all of it is tested in Node.
 */

import type { Spring } from "@play-ui/physics";

/** A box on the screen: its top-left corner and its untransformed size. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Tuning for the deal, the put-away and the flip between facets. */
export interface DeckMotionOptions {
  /** The spring the folder flies out of the pile on. */
  readonly deal: Spring;
  /** The spring it flies back on: a touch stiffer, since leaving is quicker than arriving. */
  readonly putAway: Spring;
  /** The spring a facet's contents flip in on. */
  readonly flip: Spring;
  /** Degrees the pile's top card is turned by; the folder leaves from and lands at that angle. */
  readonly pileTilt: number;
  /** Milliseconds between one side tab sliding out and the next. */
  readonly tabStagger: number;
  /** Degrees the folder's sheet swings about its tab edge when a facet flips. */
  readonly flipAngle: number;
  /** Pixels a facet's contents travel as they flip in. */
  readonly flipTravel: number;
  /** The cross-fade that replaces every motion under reduced motion, in ms. */
  readonly fade: number;
}

export const DEFAULT_DECK_MOTION: DeckMotionOptions = {
  deal: { stiffness: 170, damping: 20, mass: 1 },
  putAway: { stiffness: 260, damping: 26, mass: 1 },
  flip: { stiffness: 320, damping: 28, mass: 0.9 },
  pileTilt: -1.5,
  tabStagger: 32,
  flipAngle: 7,
  flipTravel: 10,
  fade: 140,
};

/** Every option, with the defaults filling what `partial` leaves out. */
export function resolveDeckMotion(partial?: Partial<DeckMotionOptions>): DeckMotionOptions {
  return { ...DEFAULT_DECK_MOTION, ...partial };
}

/** How long one side tab takes to slide back under the folder, in ms. */
export const TAB_TUCK = 150;

/** When each part of a put-away starts, in ms from the press. */
export interface PutAwayTimeline {
  /** The delay of the tab at `index`: the last tab goes first, back up the side. */
  readonly tab: (index: number) => number;
  /** When the sheet's contents start to fade. */
  readonly contents: number;
  /** When the sheet starts to shrink back onto the pile. */
  readonly sheet: number;
}

/**
 * The put-away in order: the tabs slide back under the folder one after
 * another, and only once the last is in does the sheet shrink onto the pile,
 * so no tab is left hanging off a sheet that has already gone small. The contents fade
 * just before the shrink, and a folder with no tabs of its own shrinks at once.
 */
export function putAwayTimeline(tabCount: number, motion: DeckMotionOptions): PutAwayTimeline {
  const step = Math.round(motion.tabStagger / 2);
  const tabsIn = tabCount > 0 ? TAB_TUCK + (tabCount - 1) * step : 0;

  return {
    tab: (index) => (tabCount - 1 - index) * step,
    contents: Math.max(0, tabsIn - 60),
    sheet: tabsIn,
  };
}

/** One corner's radii, across and down, in px. */
export type Corner = readonly [number, number];

/** An element's four corners, clockwise from the top left, as `border-radius` lists them. */
export type Corners = readonly [Corner, Corner, Corner, Corner];

/**
 * How far past its edges the sheet's clip opens once it has landed, so its
 * shadow grows in under it rather than appearing when the flight ends.
 */
export const SHADOW_ROOM = 80;

/** One frame of a flight: where the sheet is, and how much of it shows. */
interface FlightFrame {
  readonly transform: string;
  readonly clipPath: string;
}

/** The scale that fits a sheet over a card: one factor, so nothing is squashed. */
function fitScale(sheet: Box, card: Box): number {
  if (sheet.width === 0 || sheet.height === 0) return 1;

  return Math.max(card.width / sheet.width, card.height / sheet.height);
}

/** An `inset()` clip with every corner rounded, all in the element's own px. */
export function roundedInset(
  inset: { readonly x: number; readonly y: number },
  corners: Corners,
  factor = 1,
  grow = 0,
): string {
  const across = corners.map(([x]) => `${round(x * factor + grow)}px`).join(" ");
  const down = corners.map(([, y]) => `${round(y * factor + grow)}px`).join(" ");

  return `inset(${round(inset.y)}px ${round(inset.x)}px round ${across} / ${down})`;
}

/**
 * The transform that lays the folder's sheet over the pile's top card: moved
 * centre to centre, scaled by one factor until it covers the card, and
 * turned to its tilt, about the sheet's own centre. One factor, not two, so
 * the sheet's corners and contents keep their shape the whole way.
 */
export function pileTransform(sheet: Box, card: Box, tilt: number): string {
  const dx = card.x + card.width / 2 - (sheet.x + sheet.width / 2);
  const dy = card.y + card.height / 2 - (sheet.y + sheet.height / 2);
  const scale = fitScale(sheet, card);

  return `translate(${round(dx)}px, ${round(dy)}px) scale(${round(scale, 4)}) rotate(${tilt}deg)`;
}

/**
 * The clip that cuts the scaled sheet down to the card: what the one factor
 * leaves over on the longer side is inset away, and the corners are the
 * card's own, divided by the scale so they show at the card's radius.
 */
export function pileClip(sheet: Box, card: Box, cardCorners: Corners): string {
  const scale = fitScale(sheet, card);

  return roundedInset(
    {
      x: Math.max(0, (sheet.width - card.width / scale) / 2),
      y: Math.max(0, (sheet.height - card.height / scale) / 2),
    },
    cardCorners,
    1 / scale,
  );
}

/**
 * A flight between the pile's card and the sheet at rest, as keyframes for a
 * deal (`out`) or a put-away (`back`). Only `transform` and `clip-path` move,
 * so nothing is laid out per frame. The clip reaches the sheet's own edges at
 * `landing`, then opens past them by `SHADOW_ROOM` with its corners growing
 * by as much, concentric with the sheet's own, so the shadow fades in under
 * a sheet whose corners are already its own.
 */
export function pileFlight(
  sheet: Box,
  card: Box,
  tilt: number,
  corners: { readonly sheet: Corners; readonly card: Corners },
  direction: "out" | "back",
  landing = 0.9,
): Keyframe[] {
  const pile: FlightFrame = {
    transform: pileTransform(sheet, card, tilt),
    clipPath: pileClip(sheet, card, corners.card),
  };
  const edge = roundedInset({ x: 0, y: 0 }, corners.sheet);
  const open = roundedInset({ x: -SHADOW_ROOM, y: -SHADOW_ROOM }, corners.sheet, 1, SHADOW_ROOM);

  return direction === "out"
    ? [
        { ...pile, offset: 0 },
        { clipPath: edge, offset: landing },
        { transform: "none", clipPath: open, offset: 1 },
      ]
    : [
        { transform: "none", clipPath: open, offset: 0 },
        { clipPath: edge, offset: 1 - landing },
        { ...pile, offset: 1 },
      ];
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;

  return Math.round(value * factor) / factor;
}

/** Which way a flip runs: down the tabs (to a later facet) or up them. */
export function flipDirection(values: readonly string[], from: string, to: string): 1 | -1 {
  return values.indexOf(to) >= values.indexOf(from) ? 1 : -1;
}
