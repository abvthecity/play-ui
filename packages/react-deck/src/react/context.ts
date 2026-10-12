"use client";

import { createContext, useContext, type Context, type RefObject } from "react";

/**
 * `"folder"`: the side-tab folder dealt out of the pile, beside the page.
 * `"sheet"`: the phone's floating sheet, a modal dialog that rises from the
 * foot of the screen with the facets as pills inside it.
 */
export type DeckForm = "folder" | "sheet";

/**
 * Where the deck is in its life. `put-away` is the pile alone; `dealing` and
 * `putting-away` are the flights between it and the folder, while both are in
 * the page; `dealt` is the folder alone.
 */
export type DeckPhase = "put-away" | "dealing" | "dealt" | "putting-away";

export interface DeckContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string;
  select: (value: string) => void;
  /** Open the deck on `value`, or on the first facet. */
  deal: (value?: string) => void;
  values: readonly string[];
  phase: DeckPhase;
  form: DeckForm;
  reducedMotion: boolean;
  baseId: string;
  pileRef: RefObject<HTMLElement | null>;
  pileCardRef: RefObject<HTMLElement | null>;
  folderRef: RefObject<HTMLElement | null>;
  surfaceRef: RefObject<HTMLElement | null>;
  tabsRef: RefObject<HTMLElement | null>;
  backdropRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLElement | null>;
}

export const DeckContext: Context<DeckContextValue | null> = createContext<DeckContextValue | null>(
  null,
);

export function useDeckContext(part: string): DeckContextValue {
  const value = useContext(DeckContext);

  if (!value) throw new Error(`Deck.${part} must be inside Deck.Root`);

  return value;
}

/** The id of the tab that names `value`. */
export function tabId(baseId: string, value: string): string {
  return `${baseId}-tab-${value}`;
}

/** The id of the panel that holds `value`. */
export function panelId(baseId: string, value: string): string {
  return `${baseId}-panel-${value}`;
}
