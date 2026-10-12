import type { KeyboardLayout } from "../board.ts";
import { qwertyRows, US_SYMBOLS } from "./qwerty.ts";

const ROWS = /* @__PURE__ */ qwertyRows("ansi", US_SYMBOLS);

/**
 * QWERTY as sold in the US: the ANSI shape, a one-row return and a long left
 * shift. The same on every platform.
 */
export const qwertyUS: KeyboardLayout = {
  id: "qwerty-us",
  name: "QWERTY (US)",
  rows: () => ROWS,
};
