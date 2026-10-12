import { describe, expect, it } from "vitest";

import { dragProgress, releaseDirection, releaseVelocity, tiltFactor } from "./gesture.ts";

function decide(dx: number, vx: number): number {
  return releaseDirection(dx, vx, 300, 0.32, 0.5);
}

describe("releaseDirection", () => {
  it("swipes past the threshold, whichever way", () => {
    expect(decide(120, 0)).toBe(1);
    expect(decide(-120, 0)).toBe(-1);
  });

  it("springs back short of it", () => {
    expect(decide(60, 0.1)).toBe(0);
  });

  it("swipes on a fling, however short", () => {
    expect(decide(30, 0.9)).toBe(1);
  });

  it("cancels when the card is pulled back on the way out", () => {
    expect(decide(150, -0.6)).toBe(0);
  });
});

describe("tiltFactor, dragProgress and releaseVelocity", () => {
  it("tilts away from where the card was grabbed, never flat", () => {
    expect(tiltFactor(0, 400)).toBe(1);
    expect(tiltFactor(400, 400)).toBe(-1);
    expect(Math.abs(tiltFactor(200, 400))).toBeCloseTo(0.35);
  });

  it("measures progress against the threshold", () => {
    expect(dragProgress(96, 300, 0.32)).toBeCloseTo(1);
  });

  it("reads velocity over the last 90ms only", () => {
    const velocity = releaseVelocity([
      { t: 0, x: 0, y: 0 },
      { t: 200, x: 10, y: 0 },
      { t: 250, x: 60, y: 5 },
    ]);

    expect(velocity.x).toBeCloseTo(1);
    expect(velocity.y).toBeCloseTo(0.1);
  });
});
