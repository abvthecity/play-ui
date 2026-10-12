import type { KeyboardPlatform } from "../board.ts";
import { cap } from "../cap.ts";

/**
 * A Mac laptop: blank function keys, fn at the corner, then control, option
 * and command, and the words Apple prints (`delete`, `return`).
 *
 * Hotkeys are read as TanStack reads them on a Mac: `Mod` holds command.
 */
export const mac: KeyboardPlatform = {
  id: "mac",
  name: "Mac",
  functionRow: [
    cap("Escape", "esc", 1.5, { half: true }),
    ...Array.from({ length: 12 }, (_, index) =>
      cap(`F${String(index + 1)}`, "", 13 / 12, { half: true, blank: true }),
    ),
  ],
  modifierRow: [
    cap("Fn", "fn"),
    cap("ControlLeft", "⌃", 1, { modifier: "control" }),
    cap("AltLeft", "⌥", 1, { modifier: "alt" }),
    cap("MetaLeft", "⌘", 1.25, { modifier: "meta" }),
    cap("Space", "", 5),
    cap("MetaRight", "⌘", 1.25, { modifier: "meta" }),
    cap("AltRight", "⌥", 1, { modifier: "alt" }),
    cap("ArrowLeft", "←"),
    {
      stack: [cap("ArrowUp", "↑", 1, { half: true }), cap("ArrowDown", "↓", 1, { half: true })],
    },
    cap("ArrowRight", "→"),
  ],
  legends: {
    Backspace: { legend: "delete" },
    Enter: { legend: "return" },
  },
  hotkeys: "mac",
};
