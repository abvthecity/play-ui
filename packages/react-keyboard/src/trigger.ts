/**
 * What a hotkey presses on a board.
 *
 * A shortcut is a hotkey string, written as TanStack Hotkeys writes one, so
 * the string that binds it there is the one that lights it here: `"Mod+K"` is
 * a chord, `{ sequence: ["G", "I"] }` is typed one key after the other (as
 * `useHotkeySequence` takes it), and `{ any: ["1", "2", "3"] }` is any one of
 * a run. Each hotkey is read for the board's platform, so `Mod` holds command
 * on a Mac and ctrl on a PC.
 */

import type { Board } from "./board.ts";
import { parseHotkey, type HotkeyString } from "./hotkey.ts";

/** What a shortcut presses: a chord, a sequence, or any one of a run. */
export type Binding =
  | HotkeyString
  | { readonly sequence: readonly HotkeyString[] }
  | { readonly any: readonly HotkeyString[] };

/**
 * How the keys go down: all at once, one after the other, or any one of a run
 * (the reader's `1 … 6`).
 */
export type TriggerKind = "chord" | "sequence" | "any";

export interface Trigger {
  readonly kind: TriggerKind;
  /**
   * The caps each step presses, by `KeyCap.id`. A chord or a run is one step;
   * a sequence is one step per hotkey, in order.
   */
  readonly steps: readonly (readonly string[])[];
  /** Hotkeys whose key the board has no cap for, so a caller can see what it dropped. */
  readonly unknown: readonly string[];
}

/**
 * The caps one hotkey holds on `board`, or `null` when the board has no cap
 * for its key. A character typed with shift brings shift along: `?` is shift
 * and `/`, and `@` is shift and 2 on a US board but shift and the quote on a
 * British PC.
 */
export function capsForHotkey(board: Board, hotkey: HotkeyString): readonly string[] | null {
  const parsed = parseHotkey(hotkey, board.hotkeys);
  const key = board.keys.get(parsed.code === undefined ? parsed.key : `[${parsed.code}]`);

  if (!key) return null;

  const held = parsed.modifiers.flatMap((modifier) => board.modifiers[modifier]);

  return [...new Set([...held, ...key])];
}

/** The trigger for a shortcut's binding on `board`. */
export function triggerOf(board: Board, binding: Binding): Trigger {
  const unknown: string[] = [];

  function press(hotkey: HotkeyString): readonly string[] {
    const caps = capsForHotkey(board, hotkey);

    if (!caps) unknown.push(hotkey);

    return caps ?? [];
  }

  if (typeof binding === "string") return { kind: "chord", steps: [press(binding)], unknown };

  if ("any" in binding) {
    return { kind: "any", steps: [[...new Set(binding.any.flatMap(press))]], unknown };
  }

  const steps = binding.sequence.map(press);

  if (steps.length === 1) return { kind: "chord", steps, unknown };

  return { kind: "sequence", steps: steps.filter((caps) => caps.length > 0), unknown };
}

/**
 * A chord of the caps held down right now, by `KeyboardEvent.code`, for a
 * board that follows real key presses (`useHeldKeyCodes` gives them).
 */
export function chordOf(codes: Iterable<string>): Trigger {
  return { kind: "chord", steps: [[...new Set(codes)]], unknown: [] };
}

/** Each lit cap and the step it belongs to, counted from 0. */
export function litCaps(trigger: Trigger | null): ReadonlyMap<string, number> {
  const lit = new Map<string, number>();

  if (!trigger) return lit;

  trigger.steps.forEach((caps, step) => {
    for (const id of caps) if (!lit.has(id)) lit.set(id, step);
  });

  return lit;
}
