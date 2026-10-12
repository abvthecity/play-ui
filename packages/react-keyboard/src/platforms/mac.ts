import type { KeyboardPlatform } from "../board.ts";
import { cap } from "../cap.ts";

/**
 * A Mac laptop: blank function keys, fn at the corner, then control, option
 * and command, and the words Apple prints (`delete`, `return`).
 *
 * `⌘`, `cmd` and `mod` press command; a binding written for a PC's ctrl
 * still presses control.
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
    cap("ControlLeft", "⌃", 1, { sub: "control", modifier: "control" }),
    cap("AltLeft", "⌥", 1, { sub: "option", modifier: "alt" }),
    cap("MetaLeft", "⌘", 1.25, { sub: "command", modifier: "meta" }),
    cap("Space", "", 5),
    cap("MetaRight", "⌘", 1.25, { sub: "command", modifier: "meta" }),
    cap("AltRight", "⌥", 1, { sub: "option", modifier: "alt" }),
    cap("ArrowLeft", "←"),
    {
      stack: [cap("ArrowUp", "↑", 1, { half: true }), cap("ArrowDown", "↓", 1, { half: true })],
    },
    cap("ArrowRight", "→"),
  ],
  legends: {
    Backspace: { legend: "delete" },
    Enter: { legend: "↵", sub: "return" },
  },
  tokens: {
    "⌘": "meta",
    cmd: "meta",
    command: "meta",
    meta: "meta",
    mod: "meta",
    "⌃": "control",
    ctrl: "control",
    control: "control",
    "⌥": "alt",
    alt: "alt",
    opt: "alt",
    option: "alt",
    delete: ["Backspace"],
  },
};
