/**
 * The two shapes a QWERTY board comes in, filled from a table of what each
 * symbol key types. The layouts are these shapes with their own tables.
 *
 * ANSI (the US board) has a one-row return and a long left shift. ISO (most of
 * the rest of the world) has a return two rows tall, a key beside it on the
 * home row and a short left shift with an extra key before Z. The ISO return
 * is drawn as two caps with the same id, an `upper` and a `lower` half, so it
 * lights as one key.
 */

import { cap, charCap, letterCaps, type KeyRow } from "../cap.ts";

export type Shape = "ansi" | "iso";

/** What a symbol key types, by its id: `[char, shifted]`. */
export type SymbolTable = Readonly<Record<string, readonly [string, string]>>;

/** The US board's symbols, which the other layouts start from. */
export const US_SYMBOLS: SymbolTable = {
  Backquote: ["`", "~"],
  Digit1: ["1", "!"],
  Digit2: ["2", "@"],
  Digit3: ["3", "#"],
  Digit4: ["4", "$"],
  Digit5: ["5", "%"],
  Digit6: ["6", "^"],
  Digit7: ["7", "&"],
  Digit8: ["8", "*"],
  Digit9: ["9", "("],
  Digit0: ["0", ")"],
  Minus: ["-", "_"],
  Equal: ["=", "+"],
  BracketLeft: ["[", "{"],
  BracketRight: ["]", "}"],
  Backslash: ["\\", "|"],
  Semicolon: [";", ":"],
  Quote: ["'", '"'],
  Comma: [",", "<"],
  Period: [".", ">"],
  Slash: ["/", "?"],
  IntlBackslash: ["\\", "|"],
};

const DIGITS = [
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
  "Digit0",
];

/** The four rows of characters in `shape`, printed from `symbols`. */
export function qwertyRows(shape: Shape, symbols: SymbolTable): readonly KeyRow[] {
  const key = (id: string) => {
    const [char, shifted] = symbols[id] ?? ["", ""];

    return charCap(id, char, shifted);
  };

  const numberRow: KeyRow = [
    key("Backquote"),
    ...DIGITS.map(key),
    key("Minus"),
    key("Equal"),
    cap("Backspace", "⌫", 1.5),
  ];

  if (shape === "ansi") {
    return [
      numberRow,
      [
        cap("Tab", "tab", 1.5),
        ...letterCaps("qwertyuiop"),
        key("BracketLeft"),
        key("BracketRight"),
        key("Backslash"),
      ],
      [
        cap("CapsLock", "caps", 1.75),
        ...letterCaps("asdfghjkl"),
        key("Semicolon"),
        key("Quote"),
        cap("Enter", "↵", 1.75),
      ],
      [
        cap("ShiftLeft", "⇧", 2.25, { sub: "shift", modifier: "shift" }),
        ...letterCaps("zxcvbnm"),
        key("Comma"),
        key("Period"),
        key("Slash"),
        cap("ShiftRight", "⇧", 2.25, { sub: "shift", modifier: "shift" }),
      ],
    ];
  }

  return [
    numberRow,
    [
      cap("Tab", "tab", 1.5),
      ...letterCaps("qwertyuiop"),
      key("BracketLeft"),
      key("BracketRight"),
      cap("Enter", "↵", 1, { span: "upper" }),
    ],
    [
      cap("CapsLock", "caps", 1.75),
      ...letterCaps("asdfghjkl"),
      key("Semicolon"),
      key("Quote"),
      key("Backslash"),
      cap("Enter", "", 0.75, { span: "lower" }),
    ],
    [
      cap("ShiftLeft", "⇧", 1.25, { sub: "shift", modifier: "shift" }),
      key("IntlBackslash"),
      ...letterCaps("zxcvbnm"),
      key("Comma"),
      key("Period"),
      key("Slash"),
      cap("ShiftRight", "⇧", 2.25, { sub: "shift", modifier: "shift" }),
    ],
  ];
}
