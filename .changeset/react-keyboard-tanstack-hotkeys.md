---
"@play-ui/react-keyboard": minor
---

Write shortcuts as hotkey strings in the form TanStack Hotkeys uses, with no dependency on it. `triggerOf(board, "Mod+K")` lights a chord, `{ sequence: ["G", "I"] }` a sequence and `{ any: [...] }` a run, read by a built-in `parseHotkey` for the board's platform (`Mod` holds command on a Mac and ctrl on a PC), so the string bound with TanStack's `useHotkey` is the one the board lights. Platforms name their hotkey platform (`hotkeys: "mac" | "windows"`) in place of their own token tables, `capsForToken` becomes `capsForHotkey`, a board's `tokens` become `keys` and `modifiers`, and shortcut entries carry a `hotkey` binding in place of printed `keys`.
