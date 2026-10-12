import { describe, expect, it } from "vitest";

import { createBoard } from "./board.ts";
import { qwertyInternational } from "./layouts/qwerty-international.ts";
import { qwertyUK } from "./layouts/qwerty-uk.ts";
import { qwertyUS } from "./layouts/qwerty-us.ts";
import { mac } from "./platforms/mac.ts";
import { pc } from "./platforms/pc.ts";
import { capsForHotkey, chordOf, litCaps, triggerOf } from "./trigger.ts";

const US_MAC = createBoard(qwertyUS, mac);
const US_PC = createBoard(qwertyUS, pc);
const UK_PC = createBoard(qwertyUK, pc);
const UK_MAC = createBoard(qwertyUK, mac);

/** The caps one hotkey holds. */
describe("capsForHotkey", () => {
  it("reads letters and digits in either case", () => {
    expect(capsForHotkey(US_MAC, "K")).toEqual(["KeyK"]);
    expect(capsForHotkey(US_MAC, "k")).toEqual(["KeyK"]);
    expect(capsForHotkey(US_MAC, "7")).toEqual(["Digit7"]);
  });

  it("holds both caps of a modifier", () => {
    expect(capsForHotkey(US_MAC, "Meta+K")).toEqual(["MetaLeft", "MetaRight", "KeyK"]);
    expect(capsForHotkey(US_MAC, "Shift+K")).toEqual(["ShiftLeft", "ShiftRight", "KeyK"]);
  });

  it("holds command for Mod on a Mac and ctrl on a PC", () => {
    expect(capsForHotkey(US_MAC, "Mod+K")).toEqual(["MetaLeft", "MetaRight", "KeyK"]);
    expect(capsForHotkey(US_PC, "Mod+K")).toEqual(["ControlLeft", "ControlRight", "KeyK"]);
    expect(capsForHotkey(US_PC, "Meta+K")).toEqual(["MetaLeft", "KeyK"]);
    expect(capsForHotkey(US_PC, "Cmd+K")).toEqual(["MetaLeft", "KeyK"]);
  });

  it("holds shift for a shifted character, wherever the layout puts it", () => {
    expect(capsForHotkey(US_MAC, "?")).toEqual(["ShiftLeft", "ShiftRight", "Slash"]);
    expect(capsForHotkey(US_MAC, "Shift+?")).toEqual(["ShiftLeft", "ShiftRight", "Slash"]);
    expect(capsForHotkey(US_PC, "@")).toEqual(["ShiftLeft", "ShiftRight", "Digit2"]);
    expect(capsForHotkey(UK_PC, "@")).toEqual(["ShiftLeft", "ShiftRight", "Quote"]);
    expect(capsForHotkey(UK_MAC, "@")).toEqual(["ShiftLeft", "ShiftRight", "Digit2"]);
    expect(capsForHotkey(UK_PC, "£")).toEqual(["ShiftLeft", "ShiftRight", "Digit3"]);
    expect(capsForHotkey(UK_PC, "#")).toEqual(["Backslash"]);
  });

  it("finds the key before Z on an ISO board", () => {
    expect(capsForHotkey(createBoard(qwertyInternational, mac), "`")).toEqual(["IntlBackslash"]);
    expect(capsForHotkey(createBoard(qwertyInternational, pc), "`")).toEqual(["Backquote"]);
  });

  it("reads key names and aliases", () => {
    expect(capsForHotkey(US_MAC, "Mod+Enter")).toEqual(["MetaLeft", "MetaRight", "Enter"]);
    expect(capsForHotkey(US_MAC, "esc")).toEqual(["Escape"]);
    expect(capsForHotkey(US_MAC, "Space")).toEqual(["Space"]);
    expect(capsForHotkey(US_PC, "F5")).toEqual(["F5"]);
  });

  it("presses fn with another key for the keys a laptop lacks", () => {
    expect(capsForHotkey(US_MAC, "Home")).toEqual(["Fn", "ArrowLeft"]);
    expect(capsForHotkey(US_PC, "End")).toEqual(["Fn", "ArrowRight"]);
    expect(capsForHotkey(US_MAC, "Delete")).toEqual(["Fn", "Backspace"]);
  });

  it("reads a physical code in brackets", () => {
    expect(capsForHotkey(UK_PC, "Shift+[IntlBackslash]")).toEqual([
      "ShiftLeft",
      "ShiftRight",
      "IntlBackslash",
    ]);
  });

  it("has nothing for a key the board lacks", () => {
    expect(capsForHotkey(US_MAC, "£")).toBeNull();
    expect(capsForHotkey(US_MAC, "Insert")).toBeNull();
  });
});

/** What a binding presses, and how. */
describe("triggerOf", () => {
  it("holds a chord's caps in one step", () => {
    expect(triggerOf(US_MAC, "Mod+K")).toEqual({
      kind: "chord",
      steps: [["MetaLeft", "MetaRight", "KeyK"]],
      unknown: [],
    });
  });

  it("types a sequence one step per hotkey", () => {
    expect(triggerOf(US_MAC, { sequence: ["G", "I"] })).toEqual({
      kind: "sequence",
      steps: [["KeyG"], ["KeyI"]],
      unknown: [],
    });
  });

  it("reads a run as any one of its keys", () => {
    expect(triggerOf(US_MAC, { any: ["1", "2", "3"] })).toEqual({
      kind: "any",
      steps: [["Digit1", "Digit2", "Digit3"]],
      unknown: [],
    });
  });

  it("names the hotkeys it could not place", () => {
    expect(triggerOf(US_MAC, { sequence: ["G", "£"] }).unknown).toEqual(["£"]);
    expect(triggerOf(US_MAC, "Mod+£")).toEqual({ kind: "chord", steps: [[]], unknown: ["Mod+£"] });
  });
});

describe("chordOf", () => {
  it("holds the given codes once each", () => {
    expect(chordOf(["KeyA", "ShiftLeft", "KeyA"]).steps).toEqual([["KeyA", "ShiftLeft"]]);
  });
});

describe("litCaps", () => {
  it("numbers each cap by the first step that presses it", () => {
    const lit = litCaps(triggerOf(US_MAC, { sequence: ["G", "G"] }));

    expect([...lit]).toEqual([["KeyG", 0]]);
    expect(litCaps(null).size).toBe(0);
  });
});
