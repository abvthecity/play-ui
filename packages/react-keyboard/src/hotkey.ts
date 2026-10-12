/**
 * Reading a hotkey string, written the way TanStack Hotkeys writes one:
 * modifiers and a key joined by `+` (`"Mod+Shift+Z"`), a physical key by its
 * `KeyboardEvent.code` in brackets (`"[KeyK]"`). `Mod` is the platform's
 * main modifier, command on a Mac and ctrl elsewhere. The same string can be
 * bound with TanStack's `useHotkey` and lit here, with no dependency between
 * the two.
 *
 * The aliases are a superset of TanStack's, with the glyphs a Mac prints
 * (`⌘`, `⇧`, `↵`) on top, so a shortcut written either way reads the same.
 */

import type { Modifier } from "./cap.ts";

/** A platform as TanStack Hotkeys names it, which decides what `Mod` holds. */
export type HotkeyPlatform = "mac" | "windows" | "linux";

/** A hotkey string: `"Mod+K"`, `"?"`, `"Shift+[IntlBackslash]"`. */
export type HotkeyString = string;

/**
 * A hotkey taken apart: its key by canonical name (`K`, `Enter`, `?`), or its
 * physical `code` when it was given in brackets, and the modifiers held, with
 * `Mod` already resolved for the platform.
 */
export type ParsedHotkey =
  | { readonly key: string; readonly code?: undefined; readonly modifiers: readonly Modifier[] }
  | { readonly code: string; readonly key?: undefined; readonly modifiers: readonly Modifier[] };

const MODIFIER_WORDS: Readonly<Record<string, Modifier | "mod">> = {
  control: "control",
  ctrl: "control",
  "⌃": "control",
  shift: "shift",
  "⇧": "shift",
  alt: "alt",
  option: "alt",
  opt: "alt",
  "⌥": "alt",
  meta: "meta",
  command: "meta",
  cmd: "meta",
  "⌘": "meta",
  os: "meta",
  win: "meta",
  super: "meta",
  "⊞": "meta",
  mod: "mod",
  commandorcontrol: "mod",
};

const KEY_WORDS: Readonly<Record<string, string>> = {
  plus: "+",
  esc: "Escape",
  escape: "Escape",
  "⎋": "Escape",
  enter: "Enter",
  return: "Enter",
  "↵": "Enter",
  "⏎": "Enter",
  tab: "Tab",
  "⇥": "Tab",
  space: "Space",
  spacebar: "Space",
  " ": "Space",
  "␣": "Space",
  backspace: "Backspace",
  "⌫": "Backspace",
  delete: "Delete",
  del: "Delete",
  "⌦": "Delete",
  capslock: "CapsLock",
  caps: "CapsLock",
  "⇪": "CapsLock",
  fn: "Fn",
  up: "ArrowUp",
  arrowup: "ArrowUp",
  "↑": "ArrowUp",
  down: "ArrowDown",
  arrowdown: "ArrowDown",
  "↓": "ArrowDown",
  left: "ArrowLeft",
  arrowleft: "ArrowLeft",
  "←": "ArrowLeft",
  right: "ArrowRight",
  arrowright: "ArrowRight",
  "→": "ArrowRight",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pgup: "PageUp",
  pagedown: "PageDown",
  pgdn: "PageDown",
  insert: "Insert",
};

/** `word` as a modifier, with `Mod` resolved for `platform`, or `null` when it is none. */
export function modifierOf(word: string, platform: HotkeyPlatform): Modifier | null {
  const modifier = MODIFIER_WORDS[word.toLowerCase()];

  if (!modifier) return null;
  if (modifier !== "mod") return modifier;

  return platform === "mac" ? "meta" : "control";
}

/** A key's canonical name: `k` is `K`, `esc` is `Escape`, `f5` is `F5`, `?` stays `?`. */
export function keyName(word: string): string {
  const lower = word.toLowerCase();
  const named = KEY_WORDS[lower] ?? KEY_WORDS[word];

  if (named) return named;
  if (/^f\d{1,2}$/u.test(lower)) return lower.toUpperCase();
  if (word.length === 1) return word.toUpperCase();

  return word;
}

/** The parts of a hotkey: `"Mod++"` is mod and `+`, as TanStack reads it. */
function partsOf(hotkey: string): string[] {
  if (hotkey === "+") return ["+"];

  const parts = hotkey.split("+");

  // A trailing `+` is the plus key: `Mod++` splits as ["Mod", "", ""].
  if (hotkey.endsWith("++")) return [...parts.slice(0, -2), "+"];

  return parts;
}

/** Take `hotkey` apart for `platform`. */
export function parseHotkey(hotkey: HotkeyString, platform: HotkeyPlatform): ParsedHotkey {
  const parts = partsOf(hotkey.trim()).map((part) => (part === " " ? part : part.trim()));
  const last = parts.at(-1) ?? "";
  const modifiers = new Set<Modifier>();

  for (const part of parts.slice(0, -1)) {
    const modifier = modifierOf(part, platform);

    if (modifier) modifiers.add(modifier);
  }

  const code = /^\[([A-Za-z][A-Za-z0-9]*)\]$/u.exec(last)?.[1];
  const held = [...modifiers];

  if (code !== undefined) return { code, modifiers: held };

  return { key: keyName(last), modifiers: held };
}
