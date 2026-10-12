import { flipTransform, staggerDelay } from "@play-ui/react-cards";
import { describe, expect, it } from "vitest";

/** The morph between two layouts of the same cards: when each one goes, and from where. */
describe("staggerDelay", () => {
  it("waits one stagger per turn", () => {
    expect(staggerDelay(0, 4, 24, 220)).toBe(0);
    expect(staggerDelay(1, 4, 24, 220)).toBe(24);
    expect(staggerDelay(3, 4, 24, 220)).toBe(72);
  });

  it("shares the cap out over a long run, so the last turn waits no more than it", () => {
    expect(staggerDelay(23, 24, 24, 220)).toBeCloseTo(220);
    expect(staggerDelay(12, 24, 24, 220)).toBeCloseTo((220 / 23) * 12);
  });

  it("never waits for a turn past the last, a negative one, or a run of one", () => {
    expect(staggerDelay(9, 4, 24, 220)).toBe(72);
    expect(staggerDelay(-1, 4, 24, 220)).toBe(0);
    expect(staggerDelay(0, 1, 24, 220)).toBe(0);
  });
});

describe("flipTransform", () => {
  it("draws the new box in the old one, from its top-left corner", () => {
    const from = { left: 100, top: 50, width: 480, height: 330 };
    const to = { left: 20, top: 10, width: 240, height: 165 };

    expect(flipTransform(from, to)).toBe("translate(80px, 40px) scale(2, 2)");
  });

  it("is still for a box that did not move", () => {
    const box = { left: 10, top: 10, width: 200, height: 100 };

    expect(flipTransform(box, box)).toBe("translate(0px, 0px) scale(1, 1)");
  });

  it("does not divide by an empty box", () => {
    const from = { left: 0, top: 0, width: 100, height: 100 };

    expect(flipTransform(from, { left: 0, top: 0, width: 0, height: 0 })).toBe(
      "translate(0px, 0px) scale(1, 1)",
    );
  });
});
