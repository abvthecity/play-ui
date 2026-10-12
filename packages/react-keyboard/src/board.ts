/**
 * A board: a layout drawn for a platform.
 *
 * The two halves are plugins, each a plain object in its own module, so a
 * bundle carries only the ones it imports. A layout owns the four rows of
 * characters (where the keys are and what they type); a platform owns the
 * function row, the modifier row and the words printed on the named keys.
 * `createBoard` puts them together and works out, once, which caps every key
 * presses, by the key names a hotkey string is read into.
 *
 * Every row of a board adds up to the same 14.5 units, so the drawing is a
 * stack of flex rows with `flex-grow` set to each cap's width and nothing else
 * to align.
 */

import { keyCaps, type KeyCap, type KeyRow, type KeyRowItem, type Modifier } from "./cap.ts";
import { keyName, type HotkeyPlatform } from "./hotkey.ts";

/** Where the keys are and what they type: the four rows of characters. */
export interface KeyboardLayout {
  /** A stable id, set on the board's root as `data-layout`. */
  readonly id: string;
  /** A name to show people: "QWERTY (US)". */
  readonly name: string;
  /**
   * The number, top, home and bottom rows as drawn on the platform with this
   * id. A layout can print a key differently per platform, as Apple's British
   * board puts `§` where a PC's has `` ` ``.
   */
  readonly rows: (platform: string) => readonly KeyRow[];
  /** Caps to redraw on a platform, by platform id and then cap id: `AltRight` as alt gr. */
  readonly overrides?: Readonly<Record<string, Readonly<Record<string, Partial<KeyCap>>>>>;
}

/** The machine around the characters: function row, modifier row and their words. */
export interface KeyboardPlatform {
  /** A stable id, set on the board's root as `data-platform`. */
  readonly id: string;
  /** A name to show people: "Mac". */
  readonly name: string;
  /** The half-height row on top. */
  readonly functionRow: KeyRow;
  /** The row along the bottom, from the left modifiers to the arrows. */
  readonly modifierRow: KeyRow;
  /** What the platform prints on the layout's named keys, by cap id: `Enter` as "return". */
  readonly legends: Readonly<Record<string, Partial<KeyCap>>>;
  /**
   * The platform a hotkey is read for, named as TanStack Hotkeys names it: it
   * decides what `Mod` holds (command on `mac`, ctrl on `windows` and `linux`).
   */
  readonly hotkeys: HotkeyPlatform;
}

/** A layout drawn for a platform, ready for `Keyboard` and `triggerOf`. */
export interface Board {
  /** The layout's id. */
  readonly layout: string;
  /** The platform's id. */
  readonly platform: string;
  /** The platform this board's hotkeys are read for. */
  readonly hotkeys: HotkeyPlatform;
  /** Six rows, function row first. */
  readonly rows: readonly KeyRow[];
  /**
   * Every key the board has and the caps it presses, holding shift where it
   * must, by key name (`K`, `Enter`, `?`) and by physical code in
   * brackets (`[KeyK]`).
   */
  readonly keys: ReadonlyMap<string, readonly string[]>;
  /** The caps that hold each modifier: both shifts, both commands. */
  readonly modifiers: Readonly<Record<Modifier, readonly string[]>>;
}

/** The named keys, by key name, where every board has them. */
const NAMED: Readonly<Record<string, readonly string[]>> = {
  Escape: ["Escape"],
  Enter: ["Enter"],
  Tab: ["Tab"],
  Space: ["Space"],
  Backspace: ["Backspace"],
  CapsLock: ["CapsLock"],
  Fn: ["Fn"],
  ArrowUp: ["ArrowUp"],
  ArrowDown: ["ArrowDown"],
  ArrowLeft: ["ArrowLeft"],
  ArrowRight: ["ArrowRight"],
  // A laptop has no Home, End, page or forward-delete keys: they are fn with
  // another key.
  Home: ["Fn", "ArrowLeft"],
  End: ["Fn", "ArrowRight"],
  PageUp: ["Fn", "ArrowUp"],
  PageDown: ["Fn", "ArrowDown"],
  Delete: ["Fn", "Backspace"],
  ...Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => [`F${String(index + 1)}`, [`F${String(index + 1)}`]]),
  ),
};

function redraw(item: KeyRowItem, change: (cap: KeyCap) => KeyCap): KeyRowItem {
  return "stack" in item ? { stack: [change(item.stack[0]), change(item.stack[1])] } : change(item);
}

/** Draw `layout` for `platform`. */
export function createBoard(layout: KeyboardLayout, platform: KeyboardPlatform): Board {
  const overrides = layout.overrides?.[platform.id] ?? {};

  function change(base: KeyCap): KeyCap {
    const drawn = { ...base, ...platform.legends[base.id], ...overrides[base.id] };

    // The lower half of a two-row cap is only shape; the upper half says what it is.
    return drawn.span === "lower" ? { ...drawn, legend: "", sub: undefined } : drawn;
  }

  const rows = [platform.functionRow, ...layout.rows(platform.id), platform.modifierRow].map(
    (row) => row.map((item) => redraw(item, change)),
  );

  const caps = keyCaps(rows);
  const present = new Set(caps.map((each) => each.id));
  const holding = (modifier: Modifier): string[] => [
    ...new Set(caps.filter((each) => each.modifier === modifier).map((each) => each.id)),
  ];
  const modifiers = {
    shift: holding("shift"),
    control: holding("control"),
    alt: holding("alt"),
    meta: holding("meta"),
  };

  const keys = new Map<string, readonly string[]>();

  function add(key: string, ids: readonly string[]): void {
    if (keys.has(key) || !ids.every((id) => present.has(id))) return;

    keys.set(key, ids);
  }

  // The named keys first, then what the caps type: a character typed without
  // shift wins over the same one typed with it. Then every cap by its code.
  for (const [key, ids] of Object.entries(NAMED)) add(key, ids);
  for (const each of caps) if (each.char) add(keyName(each.char), [each.id]);
  for (const each of caps) {
    if (each.shifted) add(keyName(each.shifted), [...modifiers.shift, each.id]);
  }
  for (const id of present) add(`[${id}]`, [id]);

  return {
    layout: layout.id,
    platform: platform.id,
    hotkeys: platform.hotkeys,
    rows,
    keys,
    modifiers,
  };
}
