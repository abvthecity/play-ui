import { describe, expect, it } from "vitest";

import { springTiming } from "./spring.ts";

describe("springTiming", () => {
  it("samples a spring that ends exactly at 1", () => {
    const timing = springTiming({ stiffness: 300, damping: 30, mass: 1 });

    expect(timing.duration).toBeGreaterThan(200);
    expect(timing.easing).toMatch(/^linear\(0\.0000, .*, 1\)$/u);
  });
});
