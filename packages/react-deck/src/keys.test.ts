import { describe, expect, it } from "vitest";

import { deckKeyAction, tabStep } from "./keys.ts";

const FACETS = ["about", "note", "marks", "out", "in", "related"] as const;

const key = (
  name: string,
  modifiers: Partial<Record<"metaKey" | "ctrlKey" | "altKey", boolean>> = {},
) => ({
  key: name,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...modifiers,
});

describe("deckKeyAction", () => {
  it("toggles on i, closed or open, in either case", () => {
    expect(deckKeyAction(key("i"), FACETS, false)).toEqual({ type: "toggle" });
    expect(deckKeyAction(key("I"), FACETS, true)).toEqual({ type: "toggle" });
  });

  it("toggles on the key it is given instead, or on none", () => {
    expect(deckKeyAction(key("d"), FACETS, false, "d")).toEqual({ type: "toggle" });
    expect(deckKeyAction(key("i"), FACETS, false, "d")).toBeNull();
    expect(deckKeyAction(key("i"), FACETS, false, null)).toBeNull();
  });

  it("puts the deck away on Escape only when it is out", () => {
    expect(deckKeyAction(key("Escape"), FACETS, true)).toEqual({ type: "close" });
    expect(deckKeyAction(key("Escape"), FACETS, false)).toBeNull();
  });

  it("flips to the facet a number names, and to nothing past the last", () => {
    expect(deckKeyAction(key("3"), FACETS, true)).toEqual({ type: "select", value: "marks" });
    expect(deckKeyAction(key("6"), FACETS, false)).toEqual({ type: "select", value: "related" });
    expect(deckKeyAction(key("7"), FACETS, true)).toBeNull();
    expect(deckKeyAction(key("0"), FACETS, true)).toBeNull();
  });

  it("leaves anything with a modifier, and every other key, alone", () => {
    expect(deckKeyAction(key("i", { metaKey: true }), FACETS, false)).toBeNull();
    expect(deckKeyAction(key("1", { ctrlKey: true }), FACETS, true)).toBeNull();
    expect(deckKeyAction(key("m"), FACETS, true)).toBeNull();
  });
});

describe("tabStep", () => {
  it("walks the tabs on either axis and wraps at the ends", () => {
    expect(tabStep("ArrowDown", FACETS, "about")).toBe("note");
    expect(tabStep("ArrowRight", FACETS, "related")).toBe("about");
    expect(tabStep("ArrowUp", FACETS, "about")).toBe("related");
    expect(tabStep("ArrowLeft", FACETS, "note")).toBe("about");
  });

  it("jumps to the ends on Home and End, and ignores anything else", () => {
    expect(tabStep("Home", FACETS, "out")).toBe("about");
    expect(tabStep("End", FACETS, "out")).toBe("related");
    expect(tabStep("Enter", FACETS, "out")).toBeNull();
    expect(tabStep("ArrowDown", [], "out")).toBeNull();
  });
});
