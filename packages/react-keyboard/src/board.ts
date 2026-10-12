/**
 * A board: a layout drawn for a platform.
 *
 * The two halves are plugins, each a plain object in its own module, so a
 * bundle carries only the ones it imports. A layout owns the four rows of
 * characters (where the keys are and what they type); a platform owns the
 * function row, the modifier row and the words printed on the named keys.
 * `createBoard` puts them together and works out, once, which caps every
 * printed token presses.
 *
 * Every row of a board adds up to the same 14.5 units, so the drawing is a
 * stack of flex rows with `flex-grow` set to each cap's width and nothing else
 * to align.
 */

import { keyCaps, type KeyCap, type KeyRow, type KeyRowItem, type Modifier } from "./cap.ts";

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
   * What a printed token presses here: a modifier, meaning every cap that
   * holds it, or cap ids. This is where `⌘` becomes ctrl on a PC.
   */
  readonly tokens: Readonly<Record<string, Modifier | readonly string[]>>;
}

/** A layout drawn for a platform, ready for `Keyboard` and `triggerOf`. */
export interface Board {
  /** The layout's id. */
  readonly layout: string;
  /** The platform's id. */
  readonly platform: string;
  /** Six rows, function row first. */
  readonly rows: readonly KeyRow[];
  /** Every token the board knows and the caps it presses, holding shift where it must. */
  readonly tokens: ReadonlyMap<string, readonly string[]>;
}

/** The tokens every board reads the same way. */
const NAMED: Readonly<Record<string, Modifier | readonly string[]>> = {
  "⇧": "shift",
  shift: "shift",
  esc: ["Escape"],
  escape: ["Escape"],
  "↵": ["Enter"],
  enter: ["Enter"],
  return: ["Enter"],
  "⇥": ["Tab"],
  tab: ["Tab"],
  space: ["Space"],
  "␣": ["Space"],
  "⌫": ["Backspace"],
  backspace: ["Backspace"],
  "⇪": ["CapsLock"],
  caps: ["CapsLock"],
  capslock: ["CapsLock"],
  fn: ["Fn"],
  "↑": ["ArrowUp"],
  "↓": ["ArrowDown"],
  "←": ["ArrowLeft"],
  "→": ["ArrowRight"],
  up: ["ArrowUp"],
  down: ["ArrowDown"],
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
  "↑↓": ["ArrowUp", "ArrowDown"],
  // A laptop has no Home, End or page keys: they are fn with an arrow.
  home: ["Fn", "ArrowLeft"],
  end: ["Fn", "ArrowRight"],
  pageup: ["Fn", "ArrowUp"],
  pagedown: ["Fn", "ArrowDown"],
  ...Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => [`f${String(index + 1)}`, [`F${String(index + 1)}`]]),
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

  const tokens = new Map<string, readonly string[]>();

  function add(token: string, target: Modifier | readonly string[]): void {
    if (tokens.has(token)) return;

    const ids =
      typeof target === "string" ? holding(target) : target.filter((id) => present.has(id));

    if (ids.length > 0) tokens.set(token, ids);
  }

  // The platform's words first, then the shared ones, then what the caps type:
  // a character typed without shift wins over the same one typed with it.
  for (const [token, target] of Object.entries(platform.tokens)) add(token, target);
  for (const [token, target] of Object.entries(NAMED)) add(token, target);
  for (const each of caps) if (each.char) add(each.char, [each.id]);
  for (const each of caps) if (each.shifted) add(each.shifted, [...holding("shift"), each.id]);

  return { layout: layout.id, platform: platform.id, rows, tokens };
}
