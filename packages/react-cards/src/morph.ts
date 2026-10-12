/**
 * A morph between two layouts of the same things: a stack of cards and a grid
 * of them, say. Every element that stands for one thing carries its key in
 * `data-morph-key`; `captureMorph` notes where each one is before the change,
 * and `playMorph`, once the new layout has committed, plays each one from
 * where it was to where it is now (a FLIP), one after another.
 *
 * Things only the new layout draws come in from `origin(key)`, and things
 * only the old one drew leave as a copy of what they looked like, flying to
 * `destination(key)`: a stack draws four cards and a grid draws all of them,
 * so the rest of the grid rises out of the stack's last card, and falls back
 * into it on the way home.
 *
 * Framework-free. The elements' own `transform` is the morph's while it
 * plays, so put it on an element nothing else moves.
 */

import type { ReducedMotion } from "./options.ts";

export const MORPH_KEY_ATTRIBUTE = "data-morph-key";

export interface MorphOptions {
  /** ms each element takes. */
  duration: number;
  /** ms between one element and the next. */
  stagger: number;
  /** The most the whole stagger may add, in ms; a long run shares it out. */
  maxStagger: number;
  easing: string;
  reducedMotion: ReducedMotion;
}

export const DEFAULT_MORPH_OPTIONS: MorphOptions = {
  duration: 340,
  stagger: 24,
  maxStagger: 220,
  // Out fast, in soft, a touch past and back.
  easing: "cubic-bezier(0.2, 0.9, 0.3, 1.06)",
  reducedMotion: "system",
};

/** Where something is on screen: a `DOMRect`, or anything with its four numbers. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface MorphSnapshot {
  readonly boxes: ReadonlyMap<string, Box>;
  /** A copy of each element as it was, for the ones the new layout drops. */
  readonly ghosts: ReadonlyMap<string, HTMLElement>;
}

export interface PlayMorphOptions extends Partial<MorphOptions> {
  /** Where a newcomer starts; without one it fades in where it is. */
  origin?: ((key: string) => Box | null | undefined) | undefined;
  /** Where a leaver goes; without one it fades out where it was. */
  destination?: ((key: string) => Box | null | undefined) | undefined;
  /**
   * Each key's turn, 0 first. Without it the new layout's document order, then
   * the leavers in the order they were drawn.
   */
  order?: ((key: string) => number) | undefined;
  /** Where the leavers' copies are drawn. `document.body` without one. */
  layer?: HTMLElement | null | undefined;
}

/** The ms a turn waits: `stagger` per turn, squeezed so the last waits no more than `maxStagger`. */
export function staggerDelay(
  rank: number,
  count: number,
  stagger: number,
  maxStagger: number,
): number {
  if (count <= 1 || rank <= 0) return 0;

  const step = Math.min(stagger, maxStagger / (count - 1));

  return Math.min(rank, count - 1) * step;
}

/**
 * The transform that draws an element whose box is `to` in the box `from`,
 * with `transform-origin: 0 0`.
 */
export function flipTransform(from: Box, to: Box): string {
  const sx = to.width === 0 ? 1 : from.width / to.width;
  const sy = to.height === 0 ? 1 : from.height / to.height;
  const dx = from.left - to.left;
  const dy = from.top - to.top;

  return `translate(${String(dx)}px, ${String(dy)}px) scale(${String(sx)}, ${String(sy)})`;
}

/** The keyed elements under `root`, in document order; the first one wins a repeated key. */
export function morphElements(root: ParentNode): Map<string, HTMLElement> {
  const found = new Map<string, HTMLElement>();

  for (const element of root.querySelectorAll<HTMLElement>(`[${MORPH_KEY_ATTRIBUTE}]`)) {
    const key = element.getAttribute(MORPH_KEY_ATTRIBUTE);

    if (key !== null && !found.has(key)) found.set(key, element);
  }

  return found;
}

function boxOf(element: Element): Box {
  const { left, top, width, height } = element.getBoundingClientRect();

  return { left, top, width, height };
}

/** Where every keyed element under `root` is now, mid-flight or not. */
export function captureMorph(root: ParentNode): MorphSnapshot {
  const boxes = new Map<string, Box>();
  const ghosts = new Map<string, HTMLElement>();

  for (const [key, element] of morphElements(root)) {
    const box = boxOf(element);

    if (box.width === 0 && box.height === 0) continue;

    boxes.set(key, box);

    const ghost = element.cloneNode(true);

    if (ghost instanceof HTMLElement) ghosts.set(key, ghost);
  }

  return { boxes, ghosts };
}

function prefersReducedMotion(mode: ReducedMotion): boolean {
  if (mode === "always") return true;
  if (mode === "never") return false;

  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** A running morph: `finished` settles when every element has landed or it was cancelled. */
export interface MorphRun {
  readonly finished: Promise<void>;
  /** Stops at once: every element where it belongs, every copy gone. */
  cancel: () => void;
}

const DONE: MorphRun = { finished: Promise.resolve(), cancel: () => undefined };

/** Plays `root`'s keyed elements from `snapshot` to where they are now. */
export function playMorph(
  root: ParentNode,
  snapshot: MorphSnapshot,
  options: PlayMorphOptions = {},
): MorphRun {
  const settings = { ...DEFAULT_MORPH_OPTIONS, ...options };

  if (prefersReducedMotion(settings.reducedMotion) || typeof document === "undefined") return DONE;

  const now = morphElements(root);
  const leavers = [...snapshot.boxes.keys()].filter((key) => !now.has(key));
  const keys = [...now.keys(), ...leavers];
  const rank = new Map<string, number>();

  keys.forEach((key, index) => {
    rank.set(key, options.order?.(key) ?? index);
  });

  const turns = keys.length;
  const timing = (key: string): KeyframeAnimationOptions => ({
    duration: settings.duration,
    delay: staggerDelay(rank.get(key) ?? 0, turns, settings.stagger, settings.maxStagger),
    easing: settings.easing,
    fill: "backwards",
  });

  const animations: Animation[] = [];
  const copies: HTMLElement[] = [];

  for (const [key, element] of now) {
    const to = boxOf(element);
    const from = snapshot.boxes.get(key) ?? options.origin?.(key) ?? null;
    // The first turn is drawn over the last, so a card that leads stays in front.
    const lift = String(turns - (rank.get(key) ?? 0));

    element.style.zIndex = lift;

    const frames: Keyframe[] =
      from === null
        ? [
            { opacity: 0, transform: "scale(0.96)" },
            { opacity: 1, transform: "none" },
          ]
        : [
            {
              transformOrigin: "0 0",
              transform: flipTransform(from, to),
              opacity: snapshot.boxes.has(key) ? 1 : 0,
            },
            { transformOrigin: "0 0", transform: "none", opacity: 1 },
          ];

    const animation = element.animate(frames, timing(key));

    animation.addEventListener("finish", () => {
      element.style.zIndex = "";
    });
    animation.addEventListener("cancel", () => {
      element.style.zIndex = "";
    });
    animations.push(animation);
  }

  const layer = options.layer ?? document.body;

  for (const key of leavers) {
    const ghost = snapshot.ghosts.get(key);
    const from = snapshot.boxes.get(key);

    if (!ghost || !from) continue;

    ghost.removeAttribute(MORPH_KEY_ATTRIBUTE);
    ghost.setAttribute("aria-hidden", "true");
    ghost.inert = true;
    Object.assign(ghost.style, {
      position: "fixed",
      left: `${String(from.left)}px`,
      top: `${String(from.top)}px`,
      width: `${String(from.width)}px`,
      height: `${String(from.height)}px`,
      margin: "0",
      inset: "auto",
      right: "auto",
      bottom: "auto",
      boxSizing: "border-box",
      pointerEvents: "none",
      transformOrigin: "0 0",
      zIndex: String(turns - (rank.get(key) ?? 0)),
    });
    layer.append(ghost);
    copies.push(ghost);

    const to = options.destination?.(key) ?? null;
    const end: Keyframe =
      to === null
        ? { transform: "scale(0.92)", opacity: 0 }
        : { transform: flipTransform(to, from), opacity: 0 };

    const animation = ghost.animate([{ transform: "none", opacity: 1 }, end], {
      ...timing(key),
      fill: "both",
    });

    animations.push(animation);
  }

  const clear = (): void => {
    for (const copy of copies) copy.remove();
  };

  const finished = Promise.all(
    animations.map((animation) => animation.finished.catch(() => undefined)),
  ).then(clear);

  return {
    finished,
    cancel: () => {
      for (const animation of animations) animation.cancel();
      clear();
    },
  };
}
