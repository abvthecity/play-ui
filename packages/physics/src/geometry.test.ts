import { describe, expect, it } from "vitest";

import { halfSpan } from "./geometry.ts";

describe("halfSpan", () => {
  it("measures a turned card's half width", () => {
    expect(halfSpan(300, 400, 0)).toBe(150);
    expect(halfSpan(300, 400, 90)).toBeCloseTo(200);
  });
});
