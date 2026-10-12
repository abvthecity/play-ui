import type { KeyboardLayout } from "../board.ts";
import { qwertyRows, US_SYMBOLS, type SymbolTable } from "./qwerty.ts";

/** A PC's British board: `"` over 2, `@` over the quote and `#` beside return. */
const PC_SYMBOLS: SymbolTable = {
  ...US_SYMBOLS,
  Backquote: ["`", "¬"],
  Digit2: ["2", '"'],
  Digit3: ["3", "£"],
  Quote: ["'", "@"],
  Backslash: ["#", "~"],
  IntlBackslash: ["\\", "|"],
};

/** Apple's British board keeps `@` over 2, puts `§` top left and `` ` `` before Z. */
const MAC_SYMBOLS: SymbolTable = {
  ...US_SYMBOLS,
  Backquote: ["§", "±"],
  Digit3: ["3", "£"],
  Backslash: ["\\", "|"],
  IntlBackslash: ["`", "~"],
};

const PC_ROWS = /* @__PURE__ */ qwertyRows("iso", PC_SYMBOLS);
const MAC_ROWS = /* @__PURE__ */ qwertyRows("iso", MAC_SYMBOLS);

/**
 * QWERTY as sold in the UK: the ISO shape, with `£` over 3. A Mac and a PC
 * print the symbols in different places, so each gets its own.
 */
export const qwertyUK: KeyboardLayout = {
  id: "qwerty-uk",
  name: "QWERTY (UK)",
  rows: (platform) => (platform === "mac" ? MAC_ROWS : PC_ROWS),
  overrides: { pc: { AltRight: { legend: "alt gr", sub: undefined, modifier: undefined } } },
};
