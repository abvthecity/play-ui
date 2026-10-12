/**
 * The window event that opens a deck from anywhere on the page, so a button
 * built apart from the deck (an action bar, a menu item) can open it without
 * importing it.
 */

/** Asks a listening deck to open; `detail.value` names the facet, if any. */
export const OPEN_DECK_EVENT = "play-ui:open-deck";

/** What `play-ui:open-deck` carries. */
export interface OpenDeckDetail {
  readonly value?: string | undefined;
}

/** Open the deck on the page whose root has `listen`, on `value` when given. */
export function openDeck(value?: string): void {
  const detail: OpenDeckDetail = value === undefined ? {} : { value };

  window.dispatchEvent(new CustomEvent<OpenDeckDetail>(OPEN_DECK_EVENT, { detail }));
}
