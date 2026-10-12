import { describe, expect, it } from "vitest";

import { clamp, lerp } from "./math.ts";

describe("clamp and lerp", () => {
  it("holds a value between its bounds", () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(2, 0, 1)).toBe(1);
  });

  it("defaults each bound to the furthest safe integer", () => {
    expect(clamp(-1, 0)).toBe(0);
    expect(clamp(1e20, 0)).toBe(Number.MAX_SAFE_INTEGER);
    expect(clamp(-1e20, undefined, 1)).toBe(Number.MIN_SAFE_INTEGER);
    expect(clamp(Infinity)).toBe(Number.MAX_SAFE_INTEGER);
    expect(clamp(-Infinity)).toBe(Number.MIN_SAFE_INTEGER);
  });

  it("interpolates between two numbers", () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(lerp(10, 20, 1)).toBe(20);
  });
});
