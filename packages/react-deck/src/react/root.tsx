"use client";

import { renderPart, type PartProps, type ReducedMotion } from "@play-ui/utils";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
} from "react";

import { OPEN_DECK_EVENT } from "../events.ts";
import { deckKeyAction } from "../keys.ts";
import { flipDirection, resolveDeckMotion, type DeckMotionOptions } from "../motion.ts";
import {
  dealFlight,
  flipFlight,
  landFlight,
  putAwayFlight,
  settled,
  type Stage,
} from "./choreography.ts";
import { DeckContext, type DeckContextValue, type DeckForm, type DeckPhase } from "./context.ts";

/** The root's state, for `className` functions and `data-*`. */
export interface DeckRootState {
  readonly open: boolean;
  readonly value: string;
  readonly phase: DeckPhase;
  readonly form: DeckForm;
}

export interface DeckRootProps
  extends PartProps<DeckRootState>, Omit<ComponentPropsWithoutRef<"div">, "className"> {
  /** The facets, in the order the tabs draw them and the number keys count them. */
  values: readonly string[];
  /** The facet on top. */
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  /** Whether the deck is dealt. */
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** The side-tab folder beside the page, or the phone's modal sheet. */
  form?: DeckForm | undefined;
  /**
   * Bind the deck's keys on the window: `toggleKey` deals it or puts it away,
   * Escape puts it away, `1`–`9` flip to a facet. Never inside a field, never
   * with a modifier, never while another modal dialog is open. On by default.
   */
  keys?: boolean | undefined;
  /** The key that deals the deck and puts it away, `"i"` by default; null binds none. */
  toggleKey?: string | null | undefined;
  /** Open when something dispatches `play-ui:open-deck` (see `openDeck`). */
  listen?: boolean | undefined;
  /** Tune the flights; see `DEFAULT_DECK_MOTION`. */
  motion?: Partial<DeckMotionOptions> | undefined;
  /**
   * Cross-fade instead of flying: `"system"` (the default) follows the
   * viewer's setting, `"always"` and `"never"` override it.
   */
  reducedMotion?: ReducedMotion | undefined;
}

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => {
      setPrefers(query.matches);
    };

    update();
    query.addEventListener("change", update);

    return () => {
      query.removeEventListener("change", update);
    };
  }, []);

  return prefers;
}

/** Whether a key press belongs to whatever is being typed into. */
function inField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) return true;

  return (
    target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']") !==
    null
  );
}

/** Whether a modal dialog that is not the deck's is open over the page. */
function otherModalOpen(folder: HTMLElement | null): boolean {
  const dialogs = document.querySelectorAll("[role='dialog'][aria-modal='true'], dialog[open]");

  return Array.from(dialogs).some((dialog) => dialog !== folder);
}

function lockScroll(): () => void {
  const element = document.documentElement;
  const previous = element.style.overflow;

  element.style.setProperty("overflow", "hidden");

  return () => {
    element.style.setProperty("overflow", previous);
  };
}

/**
 * `Deck.Root` — owns whether the deck is dealt, which facet is on top, the
 * flights between the pile and the folder, and the deck's keys. Renders a
 * `div`.
 */
export function DeckRoot(props: DeckRootProps): ReactElement {
  const {
    values,
    value: valueProp,
    defaultValue,
    onValueChange,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    form = "folder",
    keys = true,
    toggleKey = "i",
    listen = false,
    motion: motionProp,
    reducedMotion: reducedMotionProp = "system",
    className,
    render,
    ...rest
  } = props;

  const first = values[0] ?? "";
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? first);
  const open = openProp ?? uncontrolledOpen;
  const value = valueProp ?? uncontrolledValue;
  const prefersReduced = usePrefersReducedMotion();
  const reducedMotion =
    reducedMotionProp === "system" ? prefersReduced : reducedMotionProp === "always";
  const baseId = useId().replaceAll(":", "");

  const pileRef = useRef<HTMLElement | null>(null);
  const pileCardRef = useRef<HTMLElement | null>(null);
  const folderRef = useRef<HTMLElement | null>(null);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const tabsRef = useRef<HTMLElement | null>(null);
  const backdropRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  // The phase follows `open` during render, so the frame the folder first
  // appears in is already the deal's (and the pile's last one the put-away's).
  const [phase, setPhase] = useState<DeckPhase>(open ? "dealt" : "put-away");
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    setPhase(open ? "dealing" : phase === "put-away" ? "put-away" : "putting-away");
  }

  const motionKey = JSON.stringify(motionProp ?? {});
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed on the options' contents
  const motion = useMemo(() => resolveDeckMotion(motionProp), [motionKey]);

  const stage = useCallback(
    (): Stage => ({
      folder: folderRef.current,
      surface: surfaceRef.current,
      tabs: tabsRef.current,
      backdrop: backdropRef.current,
      pile: pileRef.current,
      pileCard: pileCardRef.current,
    }),
    [],
  );

  const setOpen = useCallback(
    (next: boolean) => {
      if (next && !open) {
        const active = document.activeElement;

        returnFocus.current = active instanceof HTMLElement ? active : null;
      }

      if (openProp === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [open, openProp, onOpenChange],
  );

  const select = useCallback(
    (next: string) => {
      if (valueProp === undefined) setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [valueProp, onValueChange],
  );

  const deal = useCallback(
    (next?: string) => {
      const target = next ?? first;

      if (target !== value) select(target);
      if (!open) setOpen(true);
    },
    [first, value, select, open, setOpen],
  );

  // The flights. Each phase that moves starts its animations before the frame
  // is painted and moves on once they have all finished.
  useLayoutEffect(() => {
    if (phase !== "dealing" && phase !== "putting-away") return undefined;

    let cancelled = false;
    const flight =
      phase === "dealing"
        ? dealFlight(stage(), form, motion, reducedMotion)
        : putAwayFlight(stage(), form, motion, reducedMotion);

    void settled(flight).then(() => {
      if (cancelled) return;

      setPhase(phase === "dealing" ? "dealt" : "put-away");
    });

    return () => {
      cancelled = true;

      // Turned around mid-flight: the next one starts from rest rather than
      // from a transform this one left filled in.
      for (const animation of flight) animation.cancel();
    };
  }, [phase, form, motion, reducedMotion, stage]);

  // The pile's other cards settle back once the folder has landed.
  const landed = useRef(phase);

  useLayoutEffect(() => {
    const before = landed.current;

    landed.current = phase;

    if (before === "putting-away" && phase === "put-away") {
      landFlight(stage(), motion, reducedMotion);
    }
  }, [phase, motion, reducedMotion, stage]);

  // A facet flipping in, once the deck is out.
  const shown = useRef(value);

  useLayoutEffect(() => {
    const before = shown.current;

    shown.current = value;

    if (before === value || phase !== "dealt") return;

    flipFlight(
      surfaceRef.current,
      panelRef.current,
      flipDirection(values, before, value),
      form,
      motion,
      reducedMotion,
    );
  }, [value, phase, values, form, motion, reducedMotion]);

  // Focus goes into the folder when it is dealt, onto the tab on top, and back
  // where it came from when it is put away — when it was inside the folder.
  useEffect(() => {
    if (phase === "dealing") {
      const tab = tabsRef.current?.querySelector<HTMLElement>("[aria-selected='true']");

      (tab ?? folderRef.current)?.focus({ preventScroll: true });
    }
  }, [phase]);

  const focusWasInside = useRef(false);

  useLayoutEffect(() => {
    if (phase === "putting-away") {
      const folder = folderRef.current;
      const active = document.activeElement;

      focusWasInside.current = folder !== null && active instanceof Node && folder.contains(active);

      return;
    }

    if (phase !== "put-away" || !focusWasInside.current) return;

    focusWasInside.current = false;

    const back =
      returnFocus.current &&
      returnFocus.current.isConnected &&
      returnFocus.current !== document.body
        ? returnFocus.current
        : pileRef.current;

    back?.focus({ preventScroll: true });
  }, [phase]);

  // The page holds still under the sheet.
  useEffect(() => {
    if (form !== "sheet" || !open) return undefined;

    return lockScroll();
  }, [form, open]);

  // The keys.
  useEffect(() => {
    if (!keys) return undefined;

    const onKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.repeat) return;

      const folder = folderRef.current;
      const inSheet =
        form === "sheet" && folder !== null && event.target instanceof Node
          ? folder.contains(event.target)
          : false;

      // Inside the sheet, Escape is the dialog's (the folder handles it).
      if (inSheet && event.key === "Escape") return;
      if (inField(event.target)) return;
      if (otherModalOpen(folder)) return;
      if (form === "sheet" && !open) return;

      const action = deckKeyAction(event, values, open, toggleKey);

      if (!action) return;

      event.preventDefault();

      if (action.type === "toggle") {
        if (open) setOpen(false);
        else deal();
      } else if (action.type === "close") {
        setOpen(false);
      } else {
        select(action.value);
        if (!open) setOpen(true);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [keys, toggleKey, form, open, values, deal, select, setOpen]);

  // `openDeck()`, from anywhere on the page.
  useEffect(() => {
    if (!listen) return undefined;

    const onOpen = (event: Event): void => {
      const detail: unknown = event instanceof CustomEvent ? event.detail : null;
      const requested =
        typeof detail === "object" &&
        detail !== null &&
        "value" in detail &&
        typeof detail.value === "string"
          ? detail.value
          : undefined;

      if (requested !== undefined && values.includes(requested)) select(requested);
      if (!open) setOpen(true);
    };

    window.addEventListener(OPEN_DECK_EVENT, onOpen);

    return () => {
      window.removeEventListener(OPEN_DECK_EVENT, onOpen);
    };
  }, [listen, values, select, open, setOpen]);

  const context = useMemo(
    (): DeckContextValue => ({
      open,
      setOpen,
      value,
      select,
      deal,
      values,
      phase,
      form,
      reducedMotion,
      baseId,
      pileRef,
      pileCardRef,
      folderRef,
      surfaceRef,
      tabsRef,
      backdropRef,
      panelRef,
    }),
    [open, setOpen, value, select, deal, values, phase, form, reducedMotion, baseId],
  );

  const state: DeckRootState = { open, value, phase, form };

  return (
    <DeckContext.Provider value={context}>
      {renderPart(
        "div",
        state,
        { className, render },
        {
          "data-open": open ? "" : undefined,
          "data-phase": phase,
          "data-form": form,
          "data-value": value,
          "data-reduced-motion": reducedMotion ? "" : undefined,
        },
        rest,
      )}
    </DeckContext.Provider>
  );
}
