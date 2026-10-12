import {
  cyclePath,
  dragProgress,
  halfSpan,
  releaseDirection,
  releaseVelocity,
  springTiming,
  tiltFactor,
} from "@play-ui/physics";
import { describe, expect, it } from "vitest";

/** The motion math: every frame a component plans is worked out from these. */

const SPRING = { stiffness: 220, damping: 26, mass: 1 };

describe("cyclePath", () => {
  it("leaves at the release speed and turns with no speed left", () => {
    const path = cyclePath(120, 1.5, 400, 340, SPRING);
    const start = (path.points[1] ?? 0) - (path.points[0] ?? 0);
    const turn = (path.points[path.apexAt + 1] ?? 0) - (path.points[path.apexAt - 1] ?? 0);

    expect(start).toBeCloseTo(1.5, 1);
    expect(Math.abs(turn)).toBeLessThan(0.2);
    expect(path.apex).toBe(400);
    expect(Math.max(...path.points)).toBeCloseTo(400, 0);
  });

  it("settles home, at 0", () => {
    const path = cyclePath(0, 0, 400, 340, SPRING);

    expect(Math.abs(path.points.at(-1) ?? 1)).toBeLessThan(0.5);
  });

  it("never overshoots the turn on a hard throw", () => {
    const path = cyclePath(100, 8, 400, 340, SPRING);

    expect(Math.max(...path.points)).toBeLessThanOrEqual(400.5);
  });

  it("coasts a little and turns when released already clear", () => {
    const path = cyclePath(450, 1, 400, 340, SPRING);

    expect(path.apex).toBeGreaterThan(450);
    expect(path.apexAt).toBe(120);
  });
});

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

describe("the rest of the motion", () => {
  it("tilts away from where the card was grabbed, never flat", () => {
    expect(tiltFactor(0, 400)).toBe(1);
    expect(tiltFactor(400, 400)).toBe(-1);
    expect(Math.abs(tiltFactor(200, 400))).toBeCloseTo(0.35);
  });

  it("measures a turned card's half width", () => {
    expect(halfSpan(300, 400, 0)).toBe(150);
    expect(halfSpan(300, 400, 90)).toBeCloseTo(200);
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

  it("samples a spring that ends exactly at 1", () => {
    const timing = springTiming({ stiffness: 300, damping: 30, mass: 1 });

    expect(timing.duration).toBeGreaterThan(200);
    expect(timing.easing).toMatch(/^linear\(0\.0000, .*, 1\)$/u);
  });
});
