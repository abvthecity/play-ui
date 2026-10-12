import type { KeyboardLayout } from "../board.ts";
import { qwertyRows, US_SYMBOLS, type SymbolTable } from "./qwerty.ts";

/** Apple's International English: `§` top left and `` ` `` before Z. */
const MAC_SYMBOLS: SymbolTable = {
  ...US_SYMBOLS,
  Backquote: ["§", "±"],
  IntlBackslash: ["`", "~"],
};

const PC_ROWS = /* @__PURE__ */ qwertyRows("iso", US_SYMBOLS);
const MAC_ROWS = /* @__PURE__ */ qwertyRows("iso", MAC_SYMBOLS);

/**
 * QWERTY with the US symbols on the ISO shape, as English keyboards are sold
 * across Europe: a tall return and an extra key before Z. On a PC the right
 * alt is alt gr, which types the accents.
 */
export const qwertyInternational: KeyboardLayout = {
  id: "qwerty-international",
  name: "QWERTY (International)",
  rows: (platform) => (platform === "mac" ? MAC_ROWS : PC_ROWS),
  overrides: { pc: { AltRight: { legend: "alt gr", sub: undefined, modifier: undefined } } },
};
