/**
 * Finding a shortcut by what it does or by what it presses.
 *
 * Every word of the query has to land somewhere: in the label, in the group's
 * title, or on one of the keys. So `select` finds the selection group, `add
 * space` finds "Add to a space", `g` finds every `G` binding and every label
 * with a g in it, and `cmd k` finds `Mod+K` on a Mac. A word lands on a key
 * the way a hotkey string reads it, aliases (`cmd`, `option`, `esc`,
 * `return`) and glyphs (`⌘`, `↵`) alike. Nothing is ranked: a sheet of thirty
 * rows reads better in its own order than in a score's.
 */

import {
  keyName,
  modifierOf,
  parseHotkey,
  type HotkeyPlatform,
  type HotkeyString,
} from "./hotkey.ts";
import type { Binding } from "./trigger.ts";

/** What a searchable row needs: a name, and the binding it presses. */
export interface ShortcutEntry {
  readonly id: string;
  readonly label: string;
  readonly hotkey: Binding;
}

export interface ShortcutGroup<Entry extends ShortcutEntry = ShortcutEntry> {
  readonly id: string;
  readonly title: string;
  readonly items: readonly Entry[];
}

/** Every hotkey a binding is made of, in order. */
export function hotkeysOf(binding: Binding): readonly HotkeyString[] {
  if (typeof binding === "string") return [binding];

  return "any" in binding ? binding.any : binding.sequence;
}

function onKeys(word: string, binding: Binding, platform: HotkeyPlatform): boolean {
  const modifier = modifierOf(word, platform);
  const key = keyName(word).toLowerCase();

  return hotkeysOf(binding).some((hotkey) => {
    const parsed = parseHotkey(hotkey, platform);

    if (modifier) return parsed.modifiers.includes(modifier);

    return (parsed.code ?? parsed.key ?? "").toLowerCase() === key;
  });
}

/**
 * The groups with only the rows every word of `query` lands on, and no empty
 * groups. `platform` is the one the keys are read for (a Mac when it is left
 * out), so `cmd` finds `Mod` on a Mac and `ctrl` does on a PC.
 */
export function searchShortcuts<Entry extends ShortcutEntry>(
  groups: readonly ShortcutGroup<Entry>[],
  query: string,
  platform: HotkeyPlatform = "mac",
): ShortcutGroup<Entry>[] {
  const words = query.toLowerCase().split(/\s+/u).filter(Boolean);

  if (words.length === 0) return [...groups];

  return groups
    .map((group) => {
      const title = group.title.toLowerCase();
      const items = group.items.filter((item) => {
        const label = item.label.toLowerCase();

        return words.every(
          (word) =>
            label.includes(word) || title.includes(word) || onKeys(word, item.hotkey, platform),
        );
      });

      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);
}
