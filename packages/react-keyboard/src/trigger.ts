/**
 * What a shortcut's printed keys press on a board.
 *
 * A shortcut is printed as tokens, one cap each (`["⌘", "K"]`, `["g", "i"]`,
 * `["1", "…", "6"]`), and the tokens alone cannot say whether they are held
 * together or typed one after the other: `⇧ J` is a chord and `g i` is a
 * sequence, and both are two letters. So the caller says which, from the
 * binding it actually listens with, and this file only reads the board.
 */

import type { Board } from "./board.ts";

/**
 * How the keys go down: all at once, one after the other, or any one of a run
 * (the reader's `1 … 6`).
 */
export type TriggerKind = "chord" | "sequence" | "any";

export interface Trigger {
  readonly kind: TriggerKind;
  /**
   * The caps each step presses, by `KeyCap.id`. A chord or a run is one step;
   * a sequence is one step per token, in order.
   */
  readonly steps: readonly (readonly string[])[];
  /** Tokens the board has no cap for, so a caller can see what it dropped. */
  readonly unknown: readonly string[];
}

const RANGE = "…";

/**
 * The caps one token presses on `board`, or `null` when it has none for it.
 * A character typed with shift brings shift along: `?` is shift and `/`, and
 * `@` is shift and 2 on a US board but shift and the quote on a British PC.
 */
export function capsForToken(board: Board, token: string): readonly string[] | null {
  return board.tokens.get(token) ?? board.tokens.get(token.toLowerCase()) ?? null;
}

/** Every digit from `from` to `to`, for a printed run like `1 … 6`. */
function digitRun(from: string, to: string): string[] | null {
  const start = Number(from);
  const end = Number(to);

  if (!/^\d$/u.test(from) || !/^\d$/u.test(to) || end < start) return null;

  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

/**
 * The trigger for a shortcut's printed tokens on `board`.
 *
 * `sequence` is the caller's to say: pass `true` for a binding that is typed
 * one key after another (tinykeys writes those with a space, `"g i"`). A run
 * (`1 … 6`) is recognised from its ellipsis and is always `any`.
 */
export function triggerOf(
  board: Board,
  tokens: readonly string[],
  options: { sequence?: boolean | undefined } = {},
): Trigger {
  const unknown: string[] = [];
  const at = tokens.indexOf(RANGE);

  if (at > 0 && at < tokens.length - 1) {
    const run = digitRun(tokens[at - 1] ?? "", tokens[at + 1] ?? "");

    if (run) {
      return {
        kind: "any",
        steps: [run.flatMap((digit) => capsForToken(board, digit) ?? [])],
        unknown,
      };
    }
  }

  const resolved = tokens.map((token) => {
    const caps = capsForToken(board, token);

    if (!caps) unknown.push(token);

    return caps ?? [];
  });

  if (options.sequence && tokens.length > 1) {
    return { kind: "sequence", steps: resolved.filter((caps) => caps.length > 0), unknown };
  }

  return { kind: "chord", steps: [[...new Set(resolved.flat())]], unknown };
}

/**
 * A chord of the caps held down right now, by `KeyboardEvent.code`, for a
 * board that follows real key presses.
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
