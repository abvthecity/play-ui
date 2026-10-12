import { describe, expect, it } from "vitest";

import { keyName, modifierOf, parseHotkey } from "./hotkey.ts";

/** Hotkey strings read as TanStack Hotkeys reads them. */
describe("parseHotkey", () => {
  it("resolves Mod for the platform", () => {
    expect(parseHotkey("Mod+K", "mac")).toEqual({ key: "K", modifiers: ["meta"] });
    expect(parseHotkey("Mod+K", "windows")).toEqual({ key: "K", modifiers: ["control"] });
    expect(parseHotkey("CommandOrControl+S", "linux")).toEqual({
      key: "S",
      modifiers: ["control"],
    });
  });

  it("reads modifier aliases and glyphs", () => {
    expect(parseHotkey("Cmd+Option+Shift+z", "mac").modifiers).toEqual(["meta", "alt", "shift"]);
    expect(parseHotkey("⌘⇧", "mac").key).toBe("⌘⇧");
    expect(parseHotkey("⌘+↵", "mac")).toEqual({ key: "Enter", modifiers: ["meta"] });
    expect(parseHotkey("ctrl+esc", "windows")).toEqual({ key: "Escape", modifiers: ["control"] });
  });

  it("reads the plus key and a physical code", () => {
    expect(parseHotkey("Mod++", "mac")).toEqual({ key: "+", modifiers: ["meta"] });
    expect(parseHotkey("+", "mac")).toEqual({ key: "+", modifiers: [] });
    expect(parseHotkey("Shift+[IntlBackslash]", "mac")).toEqual({
      code: "IntlBackslash",
      modifiers: ["shift"],
    });
  });
});

describe("keyName", () => {
  it("names keys canonically", () => {
    expect(keyName("k")).toBe("K");
    expect(keyName("f5")).toBe("F5");
    expect(keyName("return")).toBe("Enter");
    expect(keyName("PgDn")).toBe("PageDown");
    expect(keyName("?")).toBe("?");
    expect(keyName("ArrowUp")).toBe("ArrowUp");
  });
});

describe("modifierOf", () => {
  it("is null for a key", () => {
    expect(modifierOf("k", "mac")).toBeNull();
    expect(modifierOf("win", "windows")).toBe("meta");
  });
});
