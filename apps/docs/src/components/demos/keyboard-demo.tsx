import {
  Keyboard,
  chordOf,
  createBoard,
  mac,
  pc,
  qwertyInternational,
  qwertyUK,
  qwertyUS,
  triggerOf,
  useShortcutSheet,
  type KeyboardLayout,
  type KeyboardPlatform,
  type ShortcutGroup,
} from "@play-ui/react-keyboard";
import { useMemo, useState, useSyncExternalStore, type ReactElement } from "react";

import { RangeControl } from "@/components/range-control.tsx";
import { SegmentedControl } from "@/components/segmented-control.tsx";

interface Shortcut {
  id: string;
  label: string;
  keys: readonly string[];
  sequence?: boolean;
}

const GROUPS: readonly ShortcutGroup<Shortcut>[] = [
  {
    id: "around",
    title: "Get around",
    items: [
      { id: "palette", label: "Search and commands", keys: ["⌘", "K"] },
      { id: "inbox", label: "Go to the inbox", keys: ["g", "i"], sequence: true },
      { id: "tab", label: "Jump to a tab", keys: ["1", "…", "9"] },
      { id: "top", label: "Back to the top", keys: ["home"] },
      { id: "help", label: "Show every shortcut", keys: ["?"] },
    ],
  },
  {
    id: "write",
    title: "Write",
    items: [
      { id: "mention", label: "Mention someone", keys: ["@"] },
      { id: "quote", label: "Quote a passage", keys: ['"'] },
      { id: "send", label: "Send", keys: ["⌘", "↵"] },
      { id: "redo", label: "Redo", keys: ["⌘", "⇧", "Z"] },
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

/** How a PC prints the glyphs a Mac shortcut is written in. */
const PC_WORDS: Readonly<Record<string, string>> = {
  "⌘": "ctrl",
  "⌥": "alt",
  "⌃": "ctrl",
  "⇧": "shift",
};

// The page is prerendered as a Mac; a reader on anything else sees their own.
const neverChanges = (): (() => void) => () => undefined;
const readerPlatform = (): PlatformId =>
  /Mac|iPhone|iPad/u.test(navigator.userAgent) ? "mac" : "pc";

/** Each token with an id of its own, so a repeated one (`g g`) keys apart. */
function numbered(keys: readonly string[]): { id: string; key: string }[] {
  return keys.map((key, index) => ({ id: `${String(index)}-${key}`, key }));
}

function Keys(props: { keys: readonly string[]; platform: PlatformId }): ReactElement {
  return (
    <span className="kb-keys">
      {numbered(props.keys).map(({ id, key }) =>
        key === "…" ? (
          <span key={id} className="kb-range">
            to
          </span>
        ) : (
          <kbd key={id} className="kb-kbd">
            {props.platform === "pc" ? (PC_WORDS[key] ?? key) : key}
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
  const [held, setHeld] = useState<ReadonlySet<string>>(() => new Set());
  const { query, setQuery, results, active, point, onInputKeyDown, attachList } =
    useShortcutSheet(GROUPS);

  const board = useMemo(
    () => createBoard(LAYOUTS[layout] ?? qwertyUS, PLATFORMS[platform] ?? mac),
    [layout, platform],
  );

  const trigger =
    held.size > 0
      ? chordOf(held)
      : active
        ? triggerOf(board, active.keys, { sequence: active.sequence })
        : null;

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
          onKeyDown={(event) => {
            onInputKeyDown(event);
            const { code } = event;
            setHeld((previous) => new Set(previous).add(code));
          }}
          onKeyUp={(event) => {
            const { code, key } = event;
            setHeld((previous) => {
              // A Mac sends no key-up for the keys let go while command is held.
              if (key === "Meta") return new Set();
              const next = new Set(previous);
              next.delete(code);
              return next;
            });
          }}
          onBlur={() => setHeld(new Set())}
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
                    <Keys keys={item.keys} platform={platform} />
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
