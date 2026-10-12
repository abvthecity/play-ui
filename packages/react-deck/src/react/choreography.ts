"use client";

import { springTiming } from "@play-ui/physics";

import {
  pileFlight,
  putAwayTimeline,
  TAB_TUCK,
  type Box,
  type Corner,
  type Corners,
  type DeckMotionOptions,
} from "../motion.ts";
import type { DeckForm } from "./context.ts";

/**
 * The deck's motion, on the Web Animations API: every flight is a set of
 * `Animation`s the root waits on, so the compositor runs them and nothing is
 * stepped from JavaScript.
 *
 * The folder is only ever *transformed* and *clipped*, never resized, so no
 * flight lays anything out per frame; its layout is the consumer's CSS and
 * is never read back except as the box a flight starts or ends at.
 */

/** The elements a flight moves. Any of them may be absent. */
export interface Stage {
  readonly folder: HTMLElement | null;
  readonly surface: HTMLElement | null;
  readonly tabs: HTMLElement | null;
  readonly backdrop: HTMLElement | null;
  readonly pile: HTMLElement | null;
  readonly pileCard: HTMLElement | null;
}

/** An element's untransformed box: where it sits, at its layout size. */
function box(element: HTMLElement): Box {
  const rect = element.getBoundingClientRect();
  const width = element.offsetWidth || rect.width;
  const height = element.offsetHeight || rect.height;

  // The bounding rect of a turned card is a little bigger than the card; the
  // centre is the same either way, so the box is rebuilt around it.
  return {
    x: rect.left + rect.width / 2 - width / 2,
    y: rect.top + rect.height / 2 - height / 2,
    width,
    height,
  };
}

/** One corner's computed radius, as px across and down. */
function corner(value: string, width: number, height: number): Corner {
  const [across = "0", down = across] = value.trim().split(/\s+/u);

  return [radiusPx(across, width), radiusPx(down, height)];
}

/** A computed radius in px, a percentage taken of the side it runs along. */
function radiusPx(part: string, side: number): number {
  return part.endsWith("%") ? (Number.parseFloat(part) / 100) * side : Number.parseFloat(part) || 0;
}

/** An element's four corners, read from its computed style. */
function cornersOf(element: HTMLElement, size: Box): Corners {
  const style = getComputedStyle(element);

  return [
    corner(style.borderTopLeftRadius, size.width, size.height),
    corner(style.borderTopRightRadius, size.width, size.height),
    corner(style.borderBottomRightRadius, size.width, size.height),
    corner(style.borderBottomLeftRadius, size.width, size.height),
  ];
}

/** The keyframes between the pile's card and the sheet at rest, read off the page. */
function pileKeyframes(
  stage: Stage,
  surface: HTMLElement,
  card: Box,
  motion: DeckMotionOptions,
  direction: "out" | "back",
): Keyframe[] {
  const sheet = box(surface);
  const cardElement = stage.pileCard ?? stage.pile;
  const cardCorners = cardElement ? cornersOf(cardElement, card) : cornersOf(surface, sheet);

  return pileFlight(
    sheet,
    card,
    motion.pileTilt,
    { sheet: cornersOf(surface, sheet), card: cardCorners },
    direction,
  );
}

/** The box of the card the folder leaves from, or null when there is no pile to see. */
function pileBox(stage: Stage): Box | null {
  const card = stage.pileCard ?? stage.pile;

  if (!card) return null;

  const found = box(card);

  return found.width === 0 || found.height === 0 ? null : found;
}

/** The tabs that fly on their own, which is only when they are not inside the sheet. */
function flyingTabs(stage: Stage): HTMLElement[] {
  const { tabs, surface } = stage;

  if (!tabs || (surface && surface.contains(tabs))) return [];

  return Array.from(tabs.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
}

/** The sheet's contents, which fade while the sheet is too small to read. */
function contents(stage: Stage): HTMLElement[] {
  if (!stage.surface) return [];

  return Array.from(stage.surface.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
}

function fade(
  element: HTMLElement | null,
  from: number,
  to: number,
  duration: number,
  delay = 0,
): Animation[] {
  if (!element || typeof element.animate !== "function") return [];

  return [
    element.animate([{ opacity: from }, { opacity: to }], {
      duration,
      delay,
      easing: "ease-out",
      fill: "both",
    }),
  ];
}

const RISE = "translateY(calc(100% + 24px))";
const LIFT = "translateY(18px) scale(0.97)";

/** The folder coming out of the pile (or up from the foot, as a sheet). */
export function dealFlight(
  stage: Stage,
  form: DeckForm,
  motion: DeckMotionOptions,
  reduced: boolean,
): Animation[] {
  const { surface } = stage;

  if (reduced) {
    return [...fade(stage.folder, 0, 1, motion.fade), ...fade(stage.backdrop, 0, 1, motion.fade)];
  }

  if (!surface || typeof surface.animate !== "function") return [];

  const spring = springTiming(motion.deal);
  const out: Animation[] = [...fade(stage.backdrop, 0, 1, 180)];
  const card = form === "folder" ? pileBox(stage) : null;

  if (card) {
    out.push(
      surface.animate(pileKeyframes(stage, surface, card, motion, "out"), {
        duration: spring.duration,
        easing: spring.easing,
        fill: "backwards",
      }),
    );
  } else {
    out.push(
      surface.animate(
        [
          { transform: form === "sheet" ? RISE : LIFT, opacity: form === "sheet" ? 1 : 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: spring.duration, easing: spring.easing, fill: "backwards" },
      ),
    );
  }

  // The words arrive once the sheet is near its size, rather than being
  // stretched across the flight.
  if (card) {
    for (const child of contents(stage)) {
      out.push(
        child.animate([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1 }], {
          duration: Math.round(spring.duration * 0.8),
          easing: "ease-out",
          fill: "backwards",
        }),
      );
    }
  }

  const tabSpring = springTiming(motion.flip);
  const start = Math.round(spring.duration * 0.3);

  flyingTabs(stage).forEach((tab, index) => {
    out.push(
      tab.animate(
        [
          { transform: "translateX(32px)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        {
          duration: tabSpring.duration,
          easing: tabSpring.easing,
          delay: start + index * motion.tabStagger,
          fill: "backwards",
        },
      ),
    );
  });

  return out;
}

/** The folder going back into the pile (or down off the foot, as a sheet). */
export function putAwayFlight(
  stage: Stage,
  form: DeckForm,
  motion: DeckMotionOptions,
  reduced: boolean,
): Animation[] {
  const { surface } = stage;

  if (reduced) {
    return [...fade(stage.folder, 1, 0, motion.fade), ...fade(stage.backdrop, 1, 0, motion.fade)];
  }

  if (!surface || typeof surface.animate !== "function") return [];

  const spring = springTiming(motion.putAway);
  const card = form === "folder" ? pileBox(stage) : null;
  const out: Animation[] = [...fade(stage.backdrop, 1, 0, 160)];
  const tabs = flyingTabs(stage);
  // Tabs first, then the sheet: it shrinks only once they are all back in.
  const timeline = putAwayTimeline(tabs.length, motion);

  tabs.forEach((tab, index) => {
    out.push(
      tab.animate(
        [
          { transform: "none", opacity: 1 },
          { transform: "translateX(32px)", opacity: 0 },
        ],
        {
          duration: TAB_TUCK,
          easing: "cubic-bezier(0.4, 0, 1, 1)",
          delay: timeline.tab(index),
          fill: "forwards",
        },
      ),
    );
  });

  if (card) {
    for (const child of contents(stage)) {
      out.push(
        child.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 110,
          easing: "ease-in",
          delay: timeline.contents,
          fill: "forwards",
        }),
      );
    }

    out.push(
      surface.animate(pileKeyframes(stage, surface, card, motion, "back"), {
        duration: spring.duration,
        easing: spring.easing,
        delay: Math.max(60, timeline.sheet),
        fill: "forwards",
      }),
    );
  } else {
    out.push(
      surface.animate(
        [
          { transform: "none", opacity: 1 },
          { transform: form === "sheet" ? RISE : LIFT, opacity: form === "sheet" ? 1 : 0 },
        ],
        {
          duration: Math.round(spring.duration * 0.8),
          easing: "ease-in",
          delay: timeline.sheet,
          fill: "forwards",
        },
      ),
    );
  }

  return out;
}

/** The pile's other cards settling back in once the folder has landed on its top one. */
export function landFlight(stage: Stage, motion: DeckMotionOptions, reduced: boolean): Animation[] {
  const { pile, pileCard } = stage;

  if (!pile) return [];

  if (reduced) return fade(pile, 0, 1, motion.fade);

  return Array.from(pile.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement && child !== pileCard)
    .flatMap((child, index) => fade(child, 0, 1, 160, index * 20));
}

/** A facet flipping in: the sheet swings on its tab edge and the new contents rise into it. */
export function flipFlight(
  surface: HTMLElement | null,
  panel: HTMLElement | null,
  direction: 1 | -1,
  form: DeckForm,
  motion: DeckMotionOptions,
  reduced: boolean,
): Animation[] {
  if (reduced) return fade(panel, 0, 1, motion.fade);

  const spring = springTiming(motion.flip);
  const out: Animation[] = [];

  if (surface && form === "folder" && typeof surface.animate === "function") {
    out.push(
      surface.animate(
        [
          {
            transformOrigin: "0% 50%",
            transform: `perspective(1600px) rotateY(${direction * motion.flipAngle}deg)`,
          },
          { transformOrigin: "0% 50%", transform: "none" },
        ],
        { duration: spring.duration, easing: spring.easing },
      ),
    );
  }

  if (panel && typeof panel.animate === "function") {
    out.push(
      panel.animate(
        [
          { opacity: 0, transform: `translateY(${direction * motion.flipTravel}px)` },
          { opacity: 1, transform: "none" },
        ],
        { duration: spring.duration, easing: spring.easing, fill: "backwards" },
      ),
    );
  }

  return out;
}

/** Wait for every animation, finished or cancelled. */
export async function settled(animations: readonly Animation[]): Promise<void> {
  await Promise.allSettled(animations.map((animation) => animation.finished));
}
