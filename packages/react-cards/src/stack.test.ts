import { describe, expect, it } from "vitest";

import { cycleKey, dismissKey, pruneDismissed, reconcileOrder } from "./stack.ts";

/** The order a server-driven list and the stack's own swipes meet in. */
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
