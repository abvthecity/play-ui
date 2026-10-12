# @play-ui/react-keyboard

## 0.2.0

### Minor Changes

- [`c02c701`](https://github.com/abvthecity/play-ui/commit/c02c701e2e4d05a6a6553f2de46d07651f8f6027) Thanks [@claude](https://github.com/claude)! - Write shortcuts as hotkey strings in the form TanStack Hotkeys uses, with no dependency on it. `triggerOf(board, "Mod+K")` lights a chord, `{ sequence: ["G", "I"] }` a sequence and `{ any: [...] }` a run, read by a built-in `parseHotkey` for the board's platform (`Mod` holds command on a Mac and ctrl on a PC), so the string bound with TanStack's `useHotkey` is the one the board lights. Platforms name their hotkey platform (`hotkeys: "mac" | "windows"`) in place of their own token tables, `capsForToken` becomes `capsForHotkey`, a board's `tokens` become `keys` and `modifiers`, and shortcut entries carry a `hotkey` binding in place of printed `keys`.

- [`37251ab`](https://github.com/abvthecity/play-ui/commit/37251abe395da32fe74ba01c696acb08aba90b98) Thanks [@claude](https://github.com/claude)! - Add `@play-ui/react-keyboard`: a headless drawn keyboard that lights the keys a shortcut presses, with the state for a searchable shortcut sheet. Layouts (`qwertyUS`, `qwertyUK`, `qwertyInternational`) and platforms (`mac`, `pc`) are separate exports, composed with `createBoard`, so a bundle keeps only the ones it imports.
