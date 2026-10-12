---
"@play-ui/react-keyboard": minor
---

Write shortcuts as TanStack Hotkeys strings. `triggerOf(board, "Mod+K")` lights a chord, `{ sequence: ["G", "I"] }` a sequence and `{ any: [...] }` a run, parsed by `@tanstack/hotkeys` for the board's platform, so the hotkey bound with `useHotkey` is the one the board lights. Platforms name their TanStack platform (`hotkeys: "mac" | "windows"`) in place of their own token tables, `capsForToken` becomes `capsForHotkey`, a board's `tokens` become `keys` and `modifiers`, and shortcut entries carry a `hotkey` binding in place of printed `keys`. Search reads key words with TanStack's aliases and display labels.
