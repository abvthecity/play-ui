import { describe, expect, it } from "vitest";

import { tallCapPath } from "./shape.ts";

const GEOMETRY = { width: 40, height: 90, foot: 30, step: 44, radius: 8 };

/** The L-shaped outline of a cap that spans two rows. */
describe("tallCapPath", () => {
  it("traces the top, the foot under its right side and the step between", () => {
    expect(tallCapPath(GEOMETRY)).toBe(
      "M8,0 H32 A8,8 0 0 1 40,8 V82 A8,8 0 0 1 32,90 H18 A8,8 0 0 1 10,82 V48 " +
        "A4,4 0 0 0 6,44 H6 A6,6 0 0 1 0,38 V8 A8,8 0 0 1 8,0 Z",
    );
  });

  it("insets every edge, and the bottom edges further", () => {
    const path = tallCapPath(GEOMETRY, 0.5, 2);

    expect(path.startsWith("M8.5,0.5 H31.5")).toBe(true);
    expect(path).toContain("V79.5");
    expect(path).toContain("A6,6 0 0 1 0.5,35.5");
  });

  it("shrinks the step's corners to fit a short step", () => {
    const path = tallCapPath({ ...GEOMETRY, width: 34, foot: 30 }, 0, 0);

    expect(path).toContain("A1.6,1.6 0 0 0");
    expect(path).toContain("A2.4,2.4 0 0 1");
  });
});
