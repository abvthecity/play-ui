/**
 * Finding a shortcut by what it does or by what it presses.
 *
 * Every word of the query has to land somewhere: in the label, in the group's
 * title, or on one of the keys. So `select` finds the selection group, `add
 * space` finds "Add to a space", `g` finds every `g` chord and every label with
 * a g in it, and `cmd k` finds ⌘K. Nothing is ranked: a sheet of thirty rows
 * reads better in its own order than in a score's.
 */

/** What a searchable row needs: a name, and the tokens printed for it. */
export interface ShortcutEntry {
  readonly id: string;
  readonly label: string;
  readonly keys: readonly string[];
}

export interface ShortcutGroup<Entry extends ShortcutEntry = ShortcutEntry> {
  readonly id: string;
  readonly title: string;
  readonly items: readonly Entry[];
}

/** The names people type for the caps that print as a glyph. */
const KEY_WORDS: Readonly<Record<string, string>> = {
  cmd: "⌘",
  command: "⌘",
  meta: "⌘",
  shift: "⇧",
  alt: "⌥",
  opt: "⌥",
  option: "⌥",
  ctrl: "⌃",
  control: "⌃",
  enter: "↵",
  return: "↵",
  escape: "esc",
  up: "↑↓",
  down: "↑↓",
  arrows: "↑↓",
};

function onKeys(word: string, keys: readonly string[]): boolean {
  const token = KEY_WORDS[word] ?? word;

  return keys.some((key) => key.toLowerCase() === token || (token === "↑↓" && key === "↑↓"));
}

/** The groups with only the rows every word of `query` lands on, and no empty groups. */
export function searchShortcuts<Entry extends ShortcutEntry>(
  groups: readonly ShortcutGroup<Entry>[],
  query: string,
): ShortcutGroup<Entry>[] {
  const words = query.toLowerCase().split(/\s+/u).filter(Boolean);

  if (words.length === 0) return [...groups];

  return groups
    .map((group) => {
      const title = group.title.toLowerCase();
      const items = group.items.filter((item) => {
        const label = item.label.toLowerCase();

        return words.every(
          (word) => label.includes(word) || title.includes(word) || onKeys(word, item.keys),
        );
      });

      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);
}
