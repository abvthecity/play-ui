import {
  cycleKey,
  dismissKey,
  pruneDismissed,
  reconcileOrder,
  resolveOptions,
  restPose,
} from "@play-ui/react-cards";
import { describe, expect, it } from "vitest";

/**
 * The card stack's pure half: where each card rests, and the order a
 * server-driven list and the stack's own swipes meet in.
 */

describe("the geometry", () => {
  it("drops each depth by half what the scale takes plus the offset", () => {
    const pose = restPose(2, {
      depthScale: 0.05,
      depthOffset: 10,
      depthShade: 0.2,
      cardHeight: 400,
    });

    expect(pose.s).toBeCloseTo(0.9);
    expect(pose.y).toBeCloseTo(2 * (10 + 10));
    expect(pose.shade).toBeCloseTo(0.4);
  });

  it("fans the cards beneath to alternating sides, the front one flat", () => {
    const geometry = {
      depthScale: 0.05,
      depthOffset: 10,
      depthShade: 0.2,
      depthRotation: 3,
      depthSpread: 12,
      cardHeight: 400,
    };

    expect(restPose(0, geometry)).toMatchObject({ x: 0, r: 0 });
    expect(restPose(1, geometry)).toMatchObject({ x: 12, r: 3 });
    expect(restPose(2, geometry).r).toBeCloseTo(-4);
    expect(restPose(2, geometry).x).toBeCloseTo(-16);
    expect(restPose(3, geometry).r).toBeCloseTo(5);
  });

  it("treats an explicit undefined option as the default", () => {
    expect(resolveOptions({ threshold: undefined, maxDepth: 5 })).toMatchObject({
      threshold: 0.32,
      maxDepth: 5,
    });
  });
});

describe("the order", () => {
  it("cycles a card to the bottom and dismisses one out", () => {
    expect(cycleKey(["a", "b", "c"], "a")).toEqual(["b", "c", "a"]);
    expect(dismissKey(["a", "b", "c"], "a")).toEqual(["b", "c"]);
  });

  it("keeps its own order, drops what left and puts what arrived at the bottom", () => {
    expect(reconcileOrder(["c", "a", "b"], ["a", "b", "d"])).toEqual(["a", "b", "d"]);
    expect(reconcileOrder(["c", "a", "b"], ["a", "b", "c", "d"])).toEqual(["c", "a", "b", "d"]);
  });

  it("keeps a dismissed card out until its owner lets it go", () => {
    const dismissed = new Set(["a"]);

    expect(reconcileOrder(["b"], ["a", "b"], dismissed)).toEqual(["b"]);
    expect([...pruneDismissed(dismissed, ["b"])]).toEqual([]);
  });
});
