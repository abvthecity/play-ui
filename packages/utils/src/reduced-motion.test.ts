import { describe, expect, it, vi } from "vitest";

import { prefersReducedMotion } from "./reduced-motion.ts";

describe("prefersReducedMotion", () => {
  it("follows an explicit mode", () => {
    expect(prefersReducedMotion("always")).toBe(true);
    expect(prefersReducedMotion("never")).toBe(false);
  });

  it("does not reduce without a window", () => {
    expect(prefersReducedMotion("system")).toBe(false);
  });

  it("asks the system when there is one", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });

    try {
      expect(prefersReducedMotion()).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
