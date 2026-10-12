"use client";

import { mergeRefs, renderPart, type PartProps } from "@play-ui/utils";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
} from "react";

import { tabStep } from "../keys.ts";
import { swipeToDismiss } from "../swipe-dismiss.ts";
import { panelId, tabId, useDeckContext, type DeckForm, type DeckPhase } from "./context.ts";

/** What every part inside the root knows. */
export interface DeckPartState {
  readonly open: boolean;
  readonly value: string;
  readonly phase: DeckPhase;
  readonly form: DeckForm;
}

/** The state of a part that has none of its own. */
const NO_STATE: Record<string, never> = {};

function usePartState(part: string): DeckPartState {
  const { open, value, phase, form } = useDeckContext(part);

  return { open, value, phase, form };
}

/* The pile ---------------------------------------------------------------- */

export interface DeckPileProps
  extends PartProps<DeckPartState>, Omit<ComponentPropsWithRef<"button">, "className"> {}

/**
 * `Deck.Pile` — the deck put away: a button that deals it, onto the first
 * facet. It stays in the page while the folder is out, so the folder has
 * somewhere to fly back to, but carries `data-hidden`, `aria-hidden` and
 * `inert` then — hide it with `visibility: hidden`, never `display: none`, or
 * the flight has nowhere to land. A `ref` is merged with the deck's own, so a
 * consumer can drag the pile (with `useDock` from `@play-ui/react-cards`, say).
 * Renders a `button`.
 */
export function DeckPile(props: DeckPileProps): ReactElement {
  const { className, render, ...rest } = props;
  const { deal, phase, open, baseId, pileRef } = useDeckContext("Pile");
  const state = usePartState("Pile");
  const hidden = phase !== "put-away";

  return renderPart(
    "button",
    state,
    { className, render },
    {
      ref: pileRef,
      type: "button",
      "aria-expanded": open,
      "aria-controls": hidden ? `${baseId}-folder` : undefined,
      "aria-hidden": hidden ? true : undefined,
      inert: hidden ? true : undefined,
      tabIndex: hidden ? -1 : undefined,
      "data-hidden": hidden ? "" : undefined,
      "data-phase": phase,
      onClick: () => {
        deal();
      },
    },
    rest,
  );
}

export interface DeckPileCardProps
  extends PartProps<DeckPartState>, Omit<ComponentPropsWithoutRef<"span">, "className"> {}

/**
 * `Deck.PileCard` — the pile's top card, the one the folder leaves from and
 * lands on. Put it inside `Deck.Pile`; without one the pile itself is the
 * card. Renders a `span`.
 */
export function DeckPileCard(props: DeckPileCardProps): ReactElement {
  const { className, render, ...rest } = props;
  const { pileCardRef } = useDeckContext("PileCard");
  const state = usePartState("PileCard");

  return renderPart("span", state, { className, render }, { ref: pileCardRef }, rest);
}

/* The folder -------------------------------------------------------------- */

export interface DeckFolderProps
  extends PartProps<DeckPartState>, Omit<ComponentPropsWithoutRef<"div">, "className"> {}

/** The elements inside `root` a Tab press can land on. */
function tabbables(root: HTMLElement): HTMLElement[] {
  const selector =
    "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1']), [contenteditable='true']";

  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => !element.hasAttribute("inert") && element.getClientRects().length > 0,
  );
}

/**
 * `Deck.Folder` — the deck dealt: the tabs and the sheet together. In the
 * page from the moment a deal starts until the put-away lands, with
 * `data-phase` saying which. As a `"folder"` it is a labelled region beside
 * the page; as a `"sheet"` it is a modal dialog — Tab and ⇧Tab wrap inside it
 * and Escape closes it. Give it an `aria-label`. Renders a `div`.
 */
export function DeckFolder(props: DeckFolderProps): ReactElement | null {
  const { className, render, ...rest } = props;
  const { phase, form, baseId, folderRef, setOpen } = useDeckContext("Folder");
  const state = usePartState("Folder");

  if (phase === "put-away") return null;

  const sheet = form === "sheet";

  return renderPart(
    "div",
    state,
    { className, render },
    {
      ref: folderRef,
      id: `${baseId}-folder`,
      role: sheet ? "dialog" : "region",
      "aria-modal": sheet ? true : undefined,
      tabIndex: -1,
      "data-phase": phase,
      "data-form": form,
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        // A `Deck.Step` inside took its own Escape first, and the Tab trap
        // has nothing to do with a key already handled.
        if (!sheet || event.defaultPrevented) return;

        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);

          return;
        }

        if (event.key !== "Tab") return;

        const found = tabbables(event.currentTarget);
        const firstElement = found[0];
        const lastElement = found.at(-1);

        if (!firstElement || !lastElement) return;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      },
    },
    rest,
  );
}

export interface DeckSurfaceProps
  extends PartProps<DeckPartState>, Omit<ComponentPropsWithoutRef<"div">, "className"> {}

/**
 * `Deck.Surface` — the folder's sheet, the coloured card the facets are
 * drawn on. It is what flies out of the pile and what swings when a facet
 * flips; `data-value` names the facet on top, for its fill. As a `"sheet"` a
 * swipe down closes it (`swipeToDismiss`), and the put-away carries on from
 * where the finger let go. Renders a `div`.
 */
export function DeckSurface(props: DeckSurfaceProps): ReactElement {
  const { className, render, ...rest } = props;
  const { surfaceRef, value, form, setOpen } = useDeckContext("Surface");
  const state = usePartState("Surface");
  const close = useRef(setOpen);

  useLayoutEffect(() => {
    close.current = setOpen;
  }, [setOpen]);

  const [node, setNode] = useState<HTMLElement | null>(null);
  const ref = useMemo(() => mergeRefs(surfaceRef, setNode), [surfaceRef]);

  // The phone's sheet closes on a swipe down. Keyed on the element and the
  // form only, so a render mid-drag (a flip, `open` changing) does not
  // detach it.
  useEffect(() => {
    if (!node || form !== "sheet") return undefined;

    return swipeToDismiss(node, () => {
      close.current(false);
    });
  }, [node, form]);

  return renderPart("div", state, { className, render }, { ref, "data-value": value }, rest);
}

export interface DeckBackdropProps
  extends PartProps<DeckPartState>, Omit<ComponentPropsWithoutRef<"div">, "className"> {}

/**
 * `Deck.Backdrop` — the scrim under the sheet. A press on it puts the deck
 * away. In the page exactly while the folder is. Renders a `div`.
 */
export function DeckBackdrop(props: DeckBackdropProps): ReactElement | null {
  const { className, render, ...rest } = props;
  const { phase, backdropRef, setOpen } = useDeckContext("Backdrop");
  const state = usePartState("Backdrop");

  if (phase === "put-away") return null;

  return renderPart(
    "div",
    state,
    { className, render },
    {
      ref: backdropRef,
      "aria-hidden": true,
      "data-phase": phase,
      onClick: () => {
        setOpen(false);
      },
    },
    rest,
  );
}

export interface DeckCloseProps
  extends PartProps<DeckPartState>, Omit<ComponentPropsWithoutRef<"button">, "className"> {}

/** `Deck.Close` — puts the deck away. Give it an `aria-label`. Renders a `button`. */
export function DeckClose(props: DeckCloseProps): ReactElement {
  const { className, render, ...rest } = props;
  const { setOpen } = useDeckContext("Close");
  const state = usePartState("Close");

  return renderPart(
    "button",
    state,
    { className, render },
    {
      type: "button",
      onClick: () => {
        setOpen(false);
      },
    },
    rest,
  );
}

export interface DeckStepProps
  extends PartProps<Record<string, never>>, Omit<ComponentPropsWithoutRef<"section">, "className"> {
  /**
   * Closes the step, on Escape pressed anywhere inside it; give the step's
   * own × the same function. Send focus back to what opened the step from
   * here — the step is gone by then.
   */
  onClose: () => void;
}

/**
 * `Deck.Step` — a step a facet opens in place (a short wizard, a confirm):
 * one layer nearer the reader than the deck. Escape
 * pressed inside it closes the step and nothing else, so a second Escape is
 * the deck's again. It works by `preventDefault()`: the sheet's dialog, the
 * root's `keys` and any consumer's own key map leave a prevented Escape alone,
 * as every keydown handler on the page should. Give it an `aria-label` or
 * `aria-labelledby`. Needs no root. Renders a `section`.
 */
export function DeckStep(props: DeckStepProps): ReactElement {
  const { className, render, onClose, ...rest } = props;

  return renderPart(
    "section",
    NO_STATE,
    { className, render },
    {
      "data-deck-step": "",
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;

        event.preventDefault();
        onClose();
      },
    },
    rest,
  );
}

/* The tabs ---------------------------------------------------------------- */

export interface DeckTabsProps
  extends PartProps<DeckPartState>, Omit<ComponentPropsWithoutRef<"div">, "className"> {
  /** `"vertical"` for the folder's side tabs, `"horizontal"` for the sheet's pills. */
  orientation?: "vertical" | "horizontal" | undefined;
}

/**
 * `Deck.Tabs` — the facets' tab list. The arrow keys, Home and End move along
 * it and flip as they go. Outside the sheet its children fly out one after
 * another as the deck is dealt; anything that is not a `Deck.Tab` (an extra
 * button at the foot of the tabs) flies with them. Give it an `aria-label`. Renders a `div`.
 */
export function DeckTabs(props: DeckTabsProps): ReactElement {
  const { className, render, orientation, ...rest } = props;
  const { tabsRef, values, value, select, baseId, form } = useDeckContext("Tabs");
  const state = usePartState("Tabs");
  const resolved = orientation ?? (form === "folder" ? "vertical" : "horizontal");

  return renderPart(
    "div",
    state,
    { className, render },
    {
      ref: tabsRef,
      role: "tablist",
      "aria-orientation": resolved,
      "data-orientation": resolved,
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (!(event.target instanceof HTMLElement) || event.target.getAttribute("role") !== "tab") {
          return;
        }

        const next = tabStep(event.key, values, value);

        if (next === null) return;

        event.preventDefault();
        select(next);
        document.getElementById(tabId(baseId, next))?.focus();
      },
    },
    rest,
  );
}

/** A tab's state: the deck's, and whether this is the one on top. */
export interface DeckTabState extends DeckPartState {
  readonly selected: boolean;
  readonly index: number;
}

export interface DeckTabProps
  extends PartProps<DeckTabState>, Omit<ComponentPropsWithoutRef<"button">, "className"> {
  /** The facet this tab flips to; one of the root's `values`. */
  value: string;
}

/**
 * `Deck.Tab` — one facet's tab. `data-selected` on the one on top, and
 * `--deck-tab-index` for anything staggered by position. Renders a `button`.
 */
export function DeckTab(props: DeckTabProps): ReactElement {
  const { className, render, value: own, style, ...rest } = props;
  const { value, values, select, baseId } = useDeckContext("Tab");
  const base = usePartState("Tab");
  const selected = own === value;
  const index = values.indexOf(own);
  const state: DeckTabState = { ...base, selected, index };
  const indexed: CSSProperties & Record<string, string> = { "--deck-tab-index": String(index) };

  return renderPart(
    "button",
    state,
    { className, render },
    {
      type: "button",
      id: tabId(baseId, own),
      role: "tab",
      "aria-selected": selected,
      "aria-controls": selected ? panelId(baseId, own) : undefined,
      tabIndex: selected ? 0 : -1,
      "data-selected": selected ? "" : undefined,
      "data-value": own,
      style: indexed,
      onClick: () => {
        select(own);
      },
    },
    { ...rest, style },
  );
}

export interface DeckPanelProps
  extends PartProps<DeckPartState>, Omit<ComponentPropsWithoutRef<"div">, "className"> {
  /** The facet this panel holds. */
  value: string;
}

/**
 * `Deck.Panel` — one facet's contents, in the page only while it is on top
 * (so a note editor inside commits on the flip away, like any unmount).
 * Renders a `div`, or nothing.
 */
export function DeckPanel(props: DeckPanelProps): ReactElement | null {
  const { className, render, value: own, ...rest } = props;
  const { value, baseId, panelRef } = useDeckContext("Panel");
  const state = usePartState("Panel");

  if (own !== value) return null;

  return renderPart(
    "div",
    state,
    { className, render },
    {
      ref: panelRef,
      id: panelId(baseId, own),
      role: "tabpanel",
      "aria-labelledby": tabId(baseId, own),
      "data-value": own,
    },
    rest,
  );
}
