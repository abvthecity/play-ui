import { describe, expect, it } from "vitest";

import { cyclePath } from "./path.ts";

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
