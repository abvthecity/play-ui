import { describe, expect, it } from "vitest";

import { searchShortcuts, type ShortcutGroup } from "./search.ts";

const GROUPS: ShortcutGroup[] = [
  {
    id: "around",
    title: "Get around",
    items: [
      { id: "palette", label: "Search and commands", keys: ["⌘", "K"] },
      { id: "inbox", label: "Go to the inbox", keys: ["g", "i"] },
    ],
  },
  {
    id: "select",
    title: "Select",
    items: [{ id: "all", label: "Select all", keys: ["⌘", "A"] }],
  },
];

/** Every word of the query lands on a label, a group title or a key. */
describe("searchShortcuts", () => {
  it("returns every group for an empty query", () => {
    expect(searchShortcuts(GROUPS, "  ")).toEqual(GROUPS);
  });

  it("matches a group's title", () => {
    expect(searchShortcuts(GROUPS, "select").map((group) => group.id)).toEqual(["select"]);
  });

  it("reads key words as their glyphs", () => {
    const ids = searchShortcuts(GROUPS, "cmd k").flatMap((group) => group.items.map((i) => i.id));

    expect(ids).toEqual(["palette"]);
  });

  it("drops groups left empty", () => {
    expect(searchShortcuts(GROUPS, "inbox")).toHaveLength(1);
  });
});
