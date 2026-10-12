import type { KeyboardPlatform } from "../board.ts";
import { cap } from "../cap.ts";

/**
 * A Windows or Linux laptop: printed F-keys, then ctrl, fn, the Windows key
 * and alt, with ctrl again on the right.
 *
 * `ctrl` and `mod` press ctrl, and so does `⌘`, so a shortcut printed for a
 * Mac lights what a PC holds for it. `win`, `super` and `meta` press the
 * Windows key.
 */
export const pc: KeyboardPlatform = {
  id: "pc",
  name: "PC",
  functionRow: [
    cap("Escape", "esc", 1.5, { half: true }),
    ...Array.from({ length: 12 }, (_, index) =>
      cap(`F${String(index + 1)}`, `F${String(index + 1)}`, 13 / 12, { half: true }),
    ),
  ],
  modifierRow: [
    cap("ControlLeft", "ctrl", 1, { modifier: "control" }),
    cap("Fn", "fn"),
    cap("MetaLeft", "⊞", 1, { modifier: "meta" }),
    cap("AltLeft", "alt", 1.25, { modifier: "alt" }),
    cap("Space", "", 5),
    cap("AltRight", "alt", 1.25, { modifier: "alt" }),
    cap("ControlRight", "ctrl", 1, { modifier: "control" }),
    cap("ArrowLeft", "←"),
    {
      stack: [cap("ArrowUp", "↑", 1, { half: true }), cap("ArrowDown", "↓", 1, { half: true })],
    },
    cap("ArrowRight", "→"),
  ],
  legends: {
    Backspace: { legend: "backspace" },
    Enter: { legend: "enter" },
  },
  tokens: {
    "⌘": "control",
    cmd: "control",
    command: "control",
    mod: "control",
    "⌃": "control",
    ctrl: "control",
    control: "control",
    "⊞": "meta",
    win: "meta",
    super: "meta",
    meta: "meta",
    "⌥": "alt",
    alt: "alt",
    opt: "alt",
    option: "alt",
  },
};
