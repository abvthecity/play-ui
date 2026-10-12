/**
 * Which key does what to the deck, as pure functions of the key pressed.
 */

/** What a key press asks of the deck. */
export type DeckKeyAction =
  | { readonly type: "toggle" }
  | { readonly type: "close" }
  | { readonly type: "select"; readonly value: string };

/** The parts of a `KeyboardEvent` the deck's keys read. */
export interface DeckKeyEvent {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
}

/**
 * The deck's keys, outside a field: `toggleKey` (`i` unless told otherwise)
 * deals it or puts it away, Escape puts it away, and `1` to `9` flip to that
 * facet, dealing the deck first when it is put away. Anything with a modifier
 * is somebody else's. A `toggleKey` of null binds no toggle.
 */
export function deckKeyAction(
  event: DeckKeyEvent,
  values: readonly string[],
  open: boolean,
  toggleKey: string | null = "i",
): DeckKeyAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;

  if (toggleKey !== null && event.key.toLowerCase() === toggleKey.toLowerCase()) {
    return { type: "toggle" };
  }

  if (event.key === "Escape") return open ? { type: "close" } : null;

  if (/^[1-9]$/u.test(event.key)) {
    const value = values[Number(event.key) - 1];

    return value === undefined ? null : { type: "select", value };
  }

  return null;
}

/** The facet a roving-focus key moves to along the tabs, or null for any other key. */
export function tabStep(key: string, values: readonly string[], current: string): string | null {
  const index = values.indexOf(current);
  const last = values.length - 1;

  if (values.length === 0) return null;

  switch (key) {
    case "ArrowDown":
    case "ArrowRight":
      return values[index >= last ? 0 : index + 1] ?? null;
    case "ArrowUp":
    case "ArrowLeft":
      return values[index <= 0 ? last : index - 1] ?? null;
    case "Home":
      return values[0] ?? null;
    case "End":
      return values[last] ?? null;
    default:
      return null;
  }
}
