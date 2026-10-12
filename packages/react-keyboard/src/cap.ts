/**
 * One cap on the board, and the rows they sit in.
 *
 * A cap's id is the `KeyboardEvent.code` of the key at that spot (`KeyK`,
 * `ShiftLeft`, `Backquote`), so it names a place on the board rather than a
 * character: `Digit2` is the same key on every layout, whether it types `@` or
 * `"` with shift held. A real key press lights its cap by `event.code` alone.
 */

/** The four modifiers a shortcut can hold. */
export type Modifier = "shift" | "control" | "alt" | "meta";

export interface KeyCap {
  /** The key's `KeyboardEvent.code`: `KeyK`, `ShiftLeft`, `ArrowUp`. */
  readonly id: string;
  /** What is printed on it. Empty for a blank. */
  readonly legend: string;
  /** What it types on its own, when that is a character: `k`, `2`, `/`. */
  readonly char?: string | undefined;
  /** What it types with shift held, printed above the legend: `@`, `?`. */
  readonly shifted?: string | undefined;
  /** A second, smaller line, for the caps that carry a word under a glyph. */
  readonly sub?: string | undefined;
  /** Width in key units; a letter is 1. */
  readonly width: number;
  /** A cap drawn half height (the function row; ↑ and ↓). */
  readonly half?: boolean | undefined;
  /** A cap with nothing on it, drawn fainter still. */
  readonly blank?: boolean | undefined;
  /** The modifier the cap holds, so a `⌘` or `shift` token finds every cap that does. */
  readonly modifier?: Modifier | undefined;
  /**
   * One half of a cap drawn across two rows, as the ISO return key is: the
   * `upper` half carries the legend, the `lower` half only the shape.
   */
  readonly span?: "upper" | "lower" | undefined;
}

/** One row of the drawing. The arrow row nests ↑ over ↓ as a `stack`. */
export type KeyRowItem = KeyCap | { readonly stack: readonly [KeyCap, KeyCap] };

export type KeyRow = readonly KeyRowItem[];

/** A cap, `width` units wide. */
export function cap(id: string, legend: string, width = 1, extra: Partial<KeyCap> = {}): KeyCap {
  return { id, legend, width, ...extra };
}

/** A character key: printed `legend`, typing `char`, and `shifted` with shift held. */
export function charCap(id: string, char: string, shifted?: string): KeyCap {
  return cap(id, char, 1, { char, shifted });
}

/** A run of letter keys, `KeyQ` and on, printed in capitals. */
export function letterCaps(chars: string): KeyCap[] {
  return chars
    .split("")
    .map((char) => cap(`Key${char.toUpperCase()}`, char.toUpperCase(), 1, { char }));
}

/** A row's width in key units, the stack counting once. */
export function rowWidth(row: KeyRow): number {
  return row.reduce((sum, item) => sum + ("stack" in item ? item.stack[0].width : item.width), 0);
}

/** Every cap in `rows`, in reading order, with the stack flattened. */
export function keyCaps(rows: readonly KeyRow[]): KeyCap[] {
  return rows.flatMap((row) => row.flatMap((item) => ("stack" in item ? item.stack : [item])));
}
