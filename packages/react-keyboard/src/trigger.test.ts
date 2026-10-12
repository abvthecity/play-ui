import { describe, expect, it } from "vitest";

import { createBoard } from "./board.ts";
import { qwertyInternational } from "./layouts/qwerty-international.ts";
import { qwertyUK } from "./layouts/qwerty-uk.ts";
import { qwertyUS } from "./layouts/qwerty-us.ts";
import { mac } from "./platforms/mac.ts";
import { pc } from "./platforms/pc.ts";
import { capsForToken, chordOf, litCaps, triggerOf } from "./trigger.ts";

const US_MAC = createBoard(qwertyUS, mac);
const US_PC = createBoard(qwertyUS, pc);
const UK_PC = createBoard(qwertyUK, pc);
const UK_MAC = createBoard(qwertyUK, mac);

/** The caps one printed token presses. */
describe("capsForToken", () => {
  it("reads letters and digits in either case", () => {
    expect(capsForToken(US_MAC, "K")).toEqual(["KeyK"]);
    expect(capsForToken(US_MAC, "k")).toEqual(["KeyK"]);
    expect(capsForToken(US_MAC, "7")).toEqual(["Digit7"]);
  });

  it("lights both caps of a modifier", () => {
    expect(capsForToken(US_MAC, "⌘")).toEqual(["MetaLeft", "MetaRight"]);
    expect(capsForToken(US_MAC, "⇧")).toEqual(["ShiftLeft", "ShiftRight"]);
  });

  it("presses ctrl for command on a PC", () => {
    expect(capsForToken(US_PC, "⌘")).toEqual(["ControlLeft", "ControlRight"]);
    expect(capsForToken(US_PC, "mod")).toEqual(["ControlLeft", "ControlRight"]);
    expect(capsForToken(US_MAC, "mod")).toEqual(["MetaLeft", "MetaRight"]);
    expect(capsForToken(US_PC, "win")).toEqual(["MetaLeft"]);
  });

  it("holds shift for a shifted character, wherever the layout puts it", () => {
    expect(capsForToken(US_MAC, "?")).toEqual(["ShiftLeft", "ShiftRight", "Slash"]);
    expect(capsForToken(US_PC, "@")).toEqual(["ShiftLeft", "ShiftRight", "Digit2"]);
    expect(capsForToken(UK_PC, "@")).toEqual(["ShiftLeft", "ShiftRight", "Quote"]);
    expect(capsForToken(UK_MAC, "@")).toEqual(["ShiftLeft", "ShiftRight", "Digit2"]);
    expect(capsForToken(UK_PC, "£")).toEqual(["ShiftLeft", "ShiftRight", "Digit3"]);
    expect(capsForToken(UK_PC, "#")).toEqual(["Backslash"]);
  });

  it("finds the key before Z on an ISO board", () => {
    expect(capsForToken(createBoard(qwertyInternational, mac), "`")).toEqual(["IntlBackslash"]);
    expect(capsForToken(createBoard(qwertyInternational, pc), "`")).toEqual(["Backquote"]);
  });

  it("presses fn with an arrow for home and end", () => {
    expect(capsForToken(US_MAC, "home")).toEqual(["Fn", "ArrowLeft"]);
    expect(capsForToken(US_PC, "end")).toEqual(["Fn", "ArrowRight"]);
  });

  it("has nothing for a token the board lacks", () => {
    expect(capsForToken(US_MAC, "£")).toBeNull();
    expect(capsForToken(UK_PC, "alt")).toEqual(["AltLeft"]);
  });
});

/** What a shortcut's printed tokens press, and how. */
describe("triggerOf", () => {
  it("holds a chord's caps in one step", () => {
    expect(triggerOf(US_MAC, ["⌘", "K"])).toEqual({
      kind: "chord",
      steps: [["MetaLeft", "MetaRight", "KeyK"]],
      unknown: [],
    });
  });

  it("types a sequence one step per token", () => {
    expect(triggerOf(US_MAC, ["g", "i"], { sequence: true })).toEqual({
      kind: "sequence",
      steps: [["KeyG"], ["KeyI"]],
      unknown: [],
    });
  });

  it("reads a run as any one of its digits", () => {
    expect(triggerOf(US_MAC, ["1", "…", "3"])).toEqual({
      kind: "any",
      steps: [["Digit1", "Digit2", "Digit3"]],
      unknown: [],
    });
  });

  it("names the tokens it could not place", () => {
    expect(triggerOf(US_MAC, ["⌘", "£"]).unknown).toEqual(["£"]);
  });
});

describe("chordOf", () => {
  it("holds the given codes once each", () => {
    expect(chordOf(["KeyA", "ShiftLeft", "KeyA"]).steps).toEqual([["KeyA", "ShiftLeft"]]);
  });
});

describe("litCaps", () => {
  it("numbers each cap by the first step that presses it", () => {
    const lit = litCaps(triggerOf(US_MAC, ["g", "g"], { sequence: true }));

    expect([...lit]).toEqual([["KeyG", 0]]);
    expect(litCaps(null).size).toBe(0);
  });
});
