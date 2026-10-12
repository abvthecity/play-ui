import { describe, expect, it } from "vitest";

import { hotkeysOf, searchShortcuts, type ShortcutGroup } from "./search.ts";

const GROUPS: ShortcutGroup[] = [
  {
    id: "around",
    title: "Get around",
    items: [
      { id: "palette", label: "Search and commands", hotkey: "Mod+K" },
      { id: "inbox", label: "Go to the inbox", hotkey: { sequence: ["G", "I"] } },
      { id: "send", label: "Send", hotkey: "Mod+Enter" },
    ],
  },
  {
    id: "select",
    title: "Select",
    items: [{ id: "all", label: "Select all", hotkey: "Mod+A" }],
  },
];

function found(query: string, platform: "mac" | "windows" = "mac"): string[] {
  return searchShortcuts(GROUPS, query, platform).flatMap((group) => group.items.map((i) => i.id));
}

/** Every word of the query lands on a label, a group title or a key. */
describe("searchShortcuts", () => {
  it("returns every group for an empty query", () => {
    expect(searchShortcuts(GROUPS, "  ")).toEqual(GROUPS);
  });

  it("matches a group's title", () => {
    expect(searchShortcuts(GROUPS, "select").map((group) => group.id)).toEqual(["select"]);
  });

  it("reads modifier words for the platform", () => {
    expect(found("cmd k")).toEqual(["palette"]);
    expect(found("ctrl k", "windows")).toEqual(["palette"]);
    expect(found("ctrl k")).toEqual([]);
  });

  it("reads key aliases and printed glyphs", () => {
    expect(found("return")).toEqual(["send"]);
    expect(found("⌘ ↵")).toEqual(["send"]);
    expect(found("g i")).toEqual(["inbox"]);
  });

  it("drops groups left empty", () => {
    expect(searchShortcuts(GROUPS, "inbox")).toHaveLength(1);
  });
});

describe("hotkeysOf", () => {
  it("lists a binding's hotkeys in order", () => {
    expect(hotkeysOf("Mod+K")).toEqual(["Mod+K"]);
    expect(hotkeysOf({ sequence: ["G", "I"] })).toEqual(["G", "I"]);
    expect(hotkeysOf({ any: ["1", "2"] })).toEqual(["1", "2"]);
  });
});
