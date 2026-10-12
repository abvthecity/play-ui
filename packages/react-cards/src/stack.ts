/**
 * The order of a stack, as keys, top first. Pure, so a server-driven list and
 * the stack's own reordering meet in one place.
 */

/** The card `key` goes from wherever it is to the bottom. */
export function cycleKey(order: readonly string[], key: string): string[] {
  if (!order.includes(key) || order.length < 2) return [...order];

  return [...order.filter((each) => each !== key), key];
}

/** The card `key` leaves the stack. */
export function dismissKey(order: readonly string[], key: string): string[] {
  return order.filter((each) => each !== key);
}

/**
 * The stack's order against the list it was given.
 *
 * Keys still in `keys` keep the place the stack gave them, keys that left
 * `keys` leave, and new keys join at the bottom in the list's own order.
 * `dismissed` keys stay out even while the list still holds them, so a card
 * swiped away does not come back before its owner has removed it.
 */
export function reconcileOrder(
  order: readonly string[],
  keys: readonly string[],
  dismissed: ReadonlySet<string> = new Set(),
): string[] {
  const present = new Set(keys);
  const kept = order.filter((key) => present.has(key) && !dismissed.has(key));
  const placed = new Set(kept);

  return [...kept, ...keys.filter((key) => !placed.has(key) && !dismissed.has(key))];
}

/** `dismissed` without the keys the list has since let go of. */
export function pruneDismissed(
  dismissed: ReadonlySet<string>,
  keys: readonly string[],
): Set<string> {
  const present = new Set(keys);

  return new Set([...dismissed].filter((key) => present.has(key)));
}
