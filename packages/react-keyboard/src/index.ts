/**
 * `@play-ui/react-keyboard` — a drawn keyboard that lights a shortcut's
 * keys, and the state for a searchable sheet of shortcuts, headless.
 *
 * Layouts and platforms are plugins: each is its own export, so a bundle
 * keeps only the ones it imports.
 *
 * ```tsx
 * import { Keyboard, createBoard, mac, qwertyUS, triggerOf } from "@play-ui/react-keyboard";
 *
 * const board = createBoard(qwertyUS, mac);
 *
 * <Keyboard board={board} trigger={triggerOf(board, ["⌘", "K"])} className="keyboard" />;
 * ```
 */
export { Keyboard, type KeyboardProps, type KeyboardState } from "./react/keyboard.tsx";

export { useShortcutSheet, type ShortcutSheet } from "./react/use-shortcut-sheet.ts";

export { createBoard, type Board, type KeyboardLayout, type KeyboardPlatform } from "./board.ts";

export {
  cap,
  charCap,
  keyCaps,
  letterCaps,
  rowWidth,
  type KeyCap,
  type KeyRow,
  type KeyRowItem,
  type Modifier,
} from "./cap.ts";

export { qwertyUS } from "./layouts/qwerty-us.ts";

export { qwertyUK } from "./layouts/qwerty-uk.ts";

export { qwertyInternational } from "./layouts/qwerty-international.ts";

export { mac } from "./platforms/mac.ts";

export { pc } from "./platforms/pc.ts";

export {
  capsForToken,
  chordOf,
  litCaps,
  triggerOf,
  type Trigger,
  type TriggerKind,
} from "./trigger.ts";

export { searchShortcuts, type ShortcutEntry, type ShortcutGroup } from "./search.ts";
