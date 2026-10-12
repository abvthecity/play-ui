import {
  Keyboard,
  chordOf,
  createBoard,
  hotkeysOf,
  mac,
  pc,
  qwertyInternational,
  qwertyUK,
  qwertyUS,
  triggerOf,
  useShortcutSheet,
  type Binding,
  type KeyboardLayout,
  type KeyboardPlatform,
  type ShortcutGroup,
} from "@play-ui/react-keyboard";
import { formatForDisplay, useHeldKeyCodes } from "@tanstack/react-hotkeys";
import { useMemo, useState, useSyncExternalStore, type ReactElement } from "react";

import { RangeControl } from "@/components/range-control.tsx";
import { SegmentedControl } from "@/components/segmented-control.tsx";

interface Shortcut {
  id: string;
  label: string;
  hotkey: Binding;
}

const GROUPS: readonly ShortcutGroup<Shortcut>[] = [
  {
    id: "around",
    title: "Get around",
    items: [
      { id: "palette", label: "Search and commands", hotkey: "Mod+K" },
      { id: "inbox", label: "Go to the inbox", hotkey: { sequence: ["G", "I"] } },
      {
        id: "tab",
        label: "Jump to a tab",
        hotkey: { any: ["1", "2", "3", "4", "5", "6", "7", "8", "9"] },
      },
      { id: "top", label: "Back to the top", hotkey: "Home" },
      { id: "help", label: "Show every shortcut", hotkey: "?" },
    ],
  },
  {
    id: "write",
    title: "Write",
    items: [
      { id: "mention", label: "Mention someone", hotkey: "@" },
      { id: "quote", label: "Quote a passage", hotkey: '"' },
      { id: "send", label: "Send", hotkey: "Mod+Enter" },
      { id: "redo", label: "Redo", hotkey: "Mod+Shift+Z" },
    ],
  },
];

const LAYOUTS: Record<string, KeyboardLayout> = {
  us: qwertyUS,
  uk: qwertyUK,
  international: qwertyInternational,
};

const PLATFORMS: Record<string, KeyboardPlatform> = { mac, pc };

type LayoutId = "us" | "uk" | "international";
type PlatformId = "mac" | "pc";

// The page is prerendered as a Mac; a reader on anything else sees their own.
const neverChanges = (): (() => void) => () => undefined;
const readerPlatform = (): PlatformId =>
  /Mac|iPhone|iPad/u.test(navigator.userAgent) ? "mac" : "pc";

/**
 * The caps to print for a binding, as TanStack prints each hotkey on the
 * platform, each with an id of its own so a repeated one (`G G`) keys apart.
 * A run prints as its ends.
 */
function printed(binding: Binding, platform: KeyboardPlatform): { id: string; key: string }[] {
  const hotkeys = hotkeysOf(binding);
  const shown =
    typeof binding !== "string" && "any" in binding
      ? [hotkeys[0] ?? "", "…", hotkeys.at(-1) ?? ""]
      : hotkeys;

  return shown
    .flatMap((hotkey) =>
      hotkey === "…"
        ? ["…"]
        : formatForDisplay(hotkey, { platform: platform.hotkeys, parts: true }),
    )
    .map((key, index) => ({ id: `${String(index)}-${key}`, key }));
}

function Keys(props: { hotkey: Binding; platform: KeyboardPlatform }): ReactElement {
  return (
    <span className="kb-keys">
      {printed(props.hotkey, props.platform).map(({ id, key }) =>
        key === "…" ? (
          <span key={id} className="kb-range">
            to
          </span>
        ) : (
          <kbd key={id} className="kb-kbd">
            {key}
          </kbd>
        ),
      )}
    </span>
  );
}

/**
 * The keyboard with a look: pick a layout and a platform, point at a
 * shortcut or search for one, and the board lights what it presses. Keys held
 * in the search field light as they go down. Everything visual lives in
 * `demos.css`.
 */
export function KeyboardDemo(): ReactElement {
  const [layout, setLayout] = useState<LayoutId>("us");
  const [chosen, setPlatform] = useState<PlatformId | null>(null);
  const detected = useSyncExternalStore(neverChanges, readerPlatform, () => "mac" as const);
  const platform = chosen ?? detected;
  const [depth, setDepth] = useState(2);
  const machine = PLATFORMS[platform] ?? mac;
  const [typing, setTyping] = useState(false);
  // TanStack tracks every key held on the page; the board follows them only
  // while the search field has focus.
  const held = Object.values(useHeldKeyCodes()).filter(Boolean);
  const { query, setQuery, results, active, point, onInputKeyDown, attachList } = useShortcutSheet(
    GROUPS,
    { platform: machine.hotkeys },
  );

  const board = useMemo(() => createBoard(LAYOUTS[layout] ?? qwertyUS, machine), [layout, machine]);

  const trigger =
    typing && held.length > 0 ? chordOf(held) : active ? triggerOf(board, active.hotkey) : null;

  return (
    <div className="kb-demo">
      <div className="kb-settings">
        <SegmentedControl
          label="Layout"
          value={layout}
          onChange={setLayout}
          options={[
            { value: "us", label: "US" },
            { value: "uk", label: "UK" },
            { value: "international", label: "International" },
          ]}
        />
        <SegmentedControl
          label="Platform"
          value={platform}
          onChange={setPlatform}
          options={[
            { value: "mac", label: "Mac" },
            { value: "pc", label: "PC" },
          ]}
        />
        <RangeControl label="Depth" value={depth} min={0} max={6} unit="px" onChange={setDepth} />
      </div>

      <Keyboard
        board={board}
        trigger={trigger}
        className="kb-board"
        style={{ "--cap-depth": `${String(depth)}px` } as Record<string, string>}
      />

      <div className="kb-sheet">
        <input
          className="kb-search"
          type="search"
          placeholder="Search shortcuts, or press any key"
          aria-label="Search shortcuts"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
        />
        <div ref={attachList} className="kb-list" onPointerLeave={() => point(null)}>
          {results.length === 0 ? <p className="kb-empty">No shortcut matches.</p> : null}
          {results.map((group) => (
            <section key={group.id} className="kb-group">
              <h4 className="kb-group-title">{group.title}</h4>
              <ul>
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    data-shortcut-id={item.id}
                    data-active={active?.id === item.id ? "" : undefined}
                    onPointerEnter={() => point(item.id)}
                  >
                    <span>{item.label}</span>
                    <Keys hotkey={item.hotkey} platform={machine} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
