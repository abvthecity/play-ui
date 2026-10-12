import { springTiming } from "@play-ui/physics";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_DECK_MOTION,
  flipDirection,
  pileClip,
  pileFlight,
  pileTransform,
  putAwayTimeline,
  resolveDeckMotion,
} from "./motion.ts";

const FACETS = ["about", "note", "marks", "out", "in", "related"] as const;

/** Four corners all of radius `r`. */
const even = (r: number) =>
  [
    [r, r],
    [r, r],
    [r, r],
    [r, r],
  ] as const;

describe("pileTransform", () => {
  it("lays the sheet over the card, centre to centre, at one scale and the card's tilt", () => {
    const sheet = { x: 1030, y: 168, width: 390, height: 660 };
    const card = { x: 1170, y: 126, width: 220, height: 118 };

    // One factor, the wider of the two, so the corners are never squashed.
    expect(pileTransform(sheet, card, -1.5)).toBe(
      "translate(55px, -313px) scale(0.5641) rotate(-1.5deg)",
    );
  });

  it("is the identity, less the tilt, when the two boxes are one", () => {
    const box = { x: 10, y: 20, width: 100, height: 50 };

    expect(pileTransform(box, box, 0)).toBe("translate(0px, 0px) scale(1) rotate(0deg)");
  });

  it("does not divide by an empty sheet", () => {
    const empty = { x: 0, y: 0, width: 0, height: 0 };

    expect(pileTransform(empty, { x: 0, y: 0, width: 10, height: 10 }, 0)).toContain("scale(1)");
  });
});

describe("pileClip and pileFlight", () => {
  const sheet = { x: 1030, y: 168, width: 390, height: 660 };
  const card = { x: 1170, y: 126, width: 220, height: 118 };

  it("cuts the scaled sheet to the card's box, with the card's own radius", () => {
    const scale = 220 / 390;
    // What shows, once scaled, is exactly the card: 220 across and 118 down.
    const down = (660 - 118 / scale) / 2;

    expect(pileClip(sheet, card, even(16))).toBe(
      `inset(${Math.round(down * 100) / 100}px 0px round ` +
        `${"28.36px ".repeat(4).trim()} / ${"28.36px ".repeat(4).trim()})`,
    );
  });

  it("moves only the transform and the clip, landing on the sheet's own corners", () => {
    const frames = pileFlight(sheet, card, -1.5, { sheet: even(24), card: even(16) }, "out");
    const properties = new Set(frames.flatMap((frame) => Object.keys(frame)));

    expect([...properties].toSorted()).toEqual(["clipPath", "offset", "transform"]);
    expect(frames[0]?.transform).toContain("scale(0.5641)");
    expect(frames[1]?.clipPath).toBe(
      "inset(0px 0px round 24px 24px 24px 24px / 24px 24px 24px 24px)",
    );
    expect(frames.at(-1)?.transform).toBe("none");
  });

  it("runs the same frames backwards for a put-away", () => {
    const corners = { sheet: even(24), card: even(16) };
    const out = pileFlight(sheet, card, -1.5, corners, "out");
    const back = pileFlight(sheet, card, -1.5, corners, "back");

    expect(back[0]?.clipPath).toBe(out.at(-1)?.clipPath);
    expect(back.at(-1)?.transform).toBe(out[0]?.transform);
    expect(back.at(-1)?.clipPath).toBe(out[0]?.clipPath);
  });
});

describe("putAwayTimeline", () => {
  it("tucks every tab before the sheet starts to shrink", () => {
    const timeline = putAwayTimeline(7, DEFAULT_DECK_MOTION);
    // The last tab in: the first one, which starts last, plus its slide.
    const tabsIn = timeline.tab(0) + 150;

    expect(timeline.tab(6), "the bottom tab goes first").toBe(0);
    expect(timeline.tab(0)).toBeGreaterThan(timeline.tab(1));
    expect(timeline.sheet).toBeGreaterThanOrEqual(tabsIn);
    expect(timeline.contents).toBeLessThan(timeline.sheet);
  });

  it("shrinks at once when the folder has no tabs of its own", () => {
    const timeline = putAwayTimeline(0, DEFAULT_DECK_MOTION);

    expect(timeline.sheet).toBe(0);
    expect(timeline.contents).toBe(0);
  });
});

describe("the default springs", () => {
  it("deal in about half a second, with the overshoot in the samples", () => {
    const timing = springTiming(DEFAULT_DECK_MOTION.deal);
    const samples = /linear\((.*)\)/u.exec(timing.easing)?.[1]?.split(", ").map(Number) ?? [];

    expect(timing.duration).toBeGreaterThan(400);
    expect(timing.duration).toBeLessThan(600);
    expect(Math.max(...samples)).toBeGreaterThan(1);
  });

  it("put away quicker than they deal", () => {
    expect(springTiming(DEFAULT_DECK_MOTION.putAway).duration).toBeLessThan(
      springTiming(DEFAULT_DECK_MOTION.deal).duration,
    );
  });
});

describe("resolveDeckMotion", () => {
  it("fills what it is not told from the defaults", () => {
    expect(resolveDeckMotion({ tabStagger: 0 })).toEqual({ ...DEFAULT_DECK_MOTION, tabStagger: 0 });
    expect(resolveDeckMotion()).toEqual(DEFAULT_DECK_MOTION);
  });
});

describe("flipDirection", () => {
  it("runs down the tabs to a later facet and up them to an earlier one", () => {
    expect(flipDirection(FACETS, "about", "out")).toBe(1);
    expect(flipDirection(FACETS, "related", "note")).toBe(-1);
  });
});
