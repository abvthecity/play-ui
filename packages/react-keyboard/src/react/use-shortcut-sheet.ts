"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefCallback,
} from "react";

import { searchShortcuts, type ShortcutEntry, type ShortcutGroup } from "../search.ts";

export interface ShortcutSheet<Entry extends ShortcutEntry> {
  query: string;
  setQuery: (query: string) => void;
  /** The groups the query leaves, in their own order. */
  results: ShortcutGroup<Entry>[];
  /** The row being pointed at or arrowed to, which is the one the board lights. */
  active: Entry | null;
  /** Point at a row (on hover or focus), or at nothing. */
  point: (id: string | null) => void;
  /** For the search field: ↑ and ↓ walk the rows without leaving it. */
  onInputKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  /** For the list, so an arrowed-to row can be scrolled into view. */
  attachList: RefCallback<HTMLElement>;
}

/**
 * The sheet's state: the query, what it leaves, and which row is active.
 *
 * With a query and nothing pointed at, the first result is active, so typing
 * `pin` lights `p` without another key. Rows are found in the list by
 * `data-shortcut-id`, which is the one attribute the caller has to set.
 */
export function useShortcutSheet<Entry extends ShortcutEntry>(
  groups: readonly ShortcutGroup<Entry>[],
): ShortcutSheet<Entry> {
  const [query, setQueryState] = useState("");
  const [pointed, setPointed] = useState<string | null>(null);
  const [arrowed, setArrowed] = useState(false);
  const list = useRef<HTMLElement | null>(null);
  const attachList = useCallback((node: HTMLElement | null) => {
    list.current = node;
  }, []);

  const results = useMemo(() => searchShortcuts(groups, query), [groups, query]);
  const flat = useMemo(() => results.flatMap((group) => group.items), [results]);

  const active =
    flat.find((item) => item.id === pointed) ?? (query.trim() ? (flat[0] ?? null) : null);

  const setQuery = useCallback((next: string) => {
    setQueryState(next);
    setPointed(null);
  }, []);

  const point = useCallback((id: string | null) => {
    setArrowed(false);
    setPointed(id);
  }, []);

  const onInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (flat.length === 0) return;

      event.preventDefault();

      const at = active ? flat.indexOf(active) : -1;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next =
        at === -1 ? (step === 1 ? 0 : flat.length - 1) : (at + step + flat.length) % flat.length;

      setArrowed(true);
      setPointed(flat[next]?.id ?? null);
    },
    [active, flat],
  );

  useEffect(() => {
    if (!arrowed || !active) return;

    const row = list.current?.querySelector(`[data-shortcut-id="${CSS.escape(active.id)}"]`);

    row?.scrollIntoView({ block: "nearest" });
  }, [active, arrowed]);

  return { query, setQuery, results, active, point, onInputKeyDown, attachList };
}
