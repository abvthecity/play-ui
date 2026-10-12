"use client";

import { renderPart, type PartProps } from "@play-ui/utils";
import {
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { flushSync } from "react-dom";

import { CardStackEngine, type CardStackHost } from "../engine.ts";
import {
  DEFAULT_SWIPE_EFFECTS,
  resolveOptions,
  type CardStackOptions,
  type SwipeDirection,
  type SwipeEffect,
  type SwipeEffects,
} from "../options.ts";
import { cycleKey, dismissKey, pruneDismissed, reconcileOrder } from "../stack.ts";
import { RootContext, type RootContextValue } from "./context.ts";

export interface CardStackSwipeDetails<Item> {
  readonly item: Item;
  readonly key: string;
  readonly direction: SwipeDirection;
  readonly effect: "cycle" | "dismiss";
}

/** The bottom card has come back to the top (`back`). */
export interface CardStackBackDetails<Item> {
  readonly item: Item;
  readonly key: string;
  readonly effect: "back";
}

/** What `actionsRef` holds. */
export interface CardStackActions {
  /** Swipe the top card, as a trigger does. False when that way is closed. */
  swipe(direction: SwipeDirection): boolean;
  /**
   * Bring the bottom card back to the top: a cycle the other way, coming out
   * from beneath the stack on the side a cycle leaves by. False with fewer
   * than two cards.
   */
  back(): boolean;
  /** Land anything in flight where it was going. */
  settle(): void;
  /** Put every card back where it rests, as after a resize. */
  layout(): void;
  /**
   * Put a card that left back on top: out of the dismissed set and first in
   * the order. Call it in the same update that puts the item back in `items`
   * (or while it is still there); a key `items` does not hold is ignored.
   */
  restore(key: string): void;
}

export interface CardStackRootState {
  readonly count: number;
  readonly empty: boolean;
}

export interface CardStackRootProps<Item>
  extends
    Omit<ComponentPropsWithRef<"div">, "className" | "children">,
    PartProps<CardStackRootState> {
  /** Everything in the stack. New items join at the bottom; the stack keeps its own order. */
  items: readonly Item[];
  /** A stable key per item. */
  getKey: (item: Item) => string;
  /** What each direction does. Default: left cycles, right dismisses. */
  effects?: Partial<SwipeEffects> | undefined;
  /** Motion and gesture settings; anything left out takes the default. */
  options?: Partial<CardStackOptions> | undefined;
  /**
   * A swipe has landed and the order has changed. A dismissed card is out of
   * the stack already; remove it from `items` whenever suits.
   */
  onSwipe?: ((details: CardStackSwipeDetails<Item>) => void) | undefined;
  /**
   * What a screen reader hears after a swipe lands, given the new top card
   * (`undefined` once the stack is empty). The package has no words of its
   * own, so without this nothing is announced.
   */
  announce?:
    | ((
        top: Item | undefined,
        details: CardStackSwipeDetails<Item> | CardStackBackDetails<Item>,
      ) => string)
    | undefined;
  /** The bottom card came back to the top, by `back` or a key in `backKeys`. */
  onBack?: ((details: CardStackBackDetails<Item>) => void) | undefined;
  /** The order changed, top first. */
  onOrderChange?: ((keys: readonly string[]) => void) | undefined;
  /** The top card was tapped rather than dragged. */
  onPress?: ((item: Item) => void) | undefined;
  /** A drag crossed the threshold (a direction) or fell back behind it (null). */
  onArmedChange?: ((direction: SwipeDirection | null) => void) | undefined;
  /** Arrow keys swipe while focus is inside. Default true. */
  keyboard?: boolean | undefined;
  /**
   * Keys (`KeyboardEvent.key`) that bring the bottom card back while focus is
   * inside, as `back` does: `["ArrowUp"]`. Default none. Off with `keyboard`.
   * A back key wins over the arrow's own swipe, so `["ArrowLeft"]` beside
   * `effects={{ left: "none", right: "cycle" }}` makes ← and → a pair.
   */
  backKeys?: readonly string[] | undefined;
  actionsRef?: Ref<CardStackActions> | undefined;
  children?: ReactNode;
}

interface OrderState {
  readonly order: readonly string[];
  readonly dismissed: ReadonlySet<string>;
}

/**
 * Read by a screen reader, drawn nowhere: the usual visually-hidden box. Inline
 * because the package ships no stylesheet and the box must hide itself.
 */
/* oxlint-disable shadcn/no-inline-styles */
const HIDDEN = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;
/* oxlint-enable shadcn/no-inline-styles */

const KEYS: Readonly<Record<string, SwipeDirection>> = { ArrowLeft: "left", ArrowRight: "right" };

const NO_KEYS: readonly string[] = [];

/**
 * The stack: its items, its order and its engine. Renders a `<div>`.
 *
 * Data attributes: `data-empty` when nothing is left, `data-count`.
 */
export function CardStackRoot<Item>(props: CardStackRootProps<Item>): ReactElement {
  const {
    items,
    getKey,
    effects: effectsProp,
    options: optionsProp,
    onSwipe,
    announce,
    onOrderChange,
    onPress,
    onArmedChange,
    onBack,
    keyboard = true,
    backKeys = NO_KEYS,
    actionsRef,
    className,
    render,
    children,
    ...rest
  } = props;

  const keys = useMemo(() => items.map(getKey), [items, getKey]);
  const [state, setState] = useState<OrderState>(() => ({ order: keys, dismissed: new Set() }));
  const order = useMemo(() => reconcileOrder(state.order, keys, state.dismissed), [state, keys]);
  const byKey = useMemo(() => new Map(items.map((item) => [getKey(item), item])), [items, getKey]);
  const ordered = useMemo(
    () =>
      order.flatMap((key) => {
        const item = byKey.get(key);

        return item === undefined ? [] : [item];
      }),
    [order, byKey],
  );
  const options = useMemo(() => resolveOptions(optionsProp), [optionsProp]);
  const effects = useMemo<SwipeEffects>(
    () => ({ ...DEFAULT_SWIPE_EFFECTS, ...effectsProp }),
    [effectsProp],
  );

  const [engine] = useState(() => new CardStackEngine());
  const [announcement, setAnnouncement] = useState("");

  useLayoutEffect(() => () => engine.destroy(), [engine]);

  // What the engine reads when it acts. Rebuilt every render and handed over
  // once the render commits, so a swipe always works on the order on screen.
  const host: CardStackHost = {
    count: () => order.length,
    topKey: () => order[0] ?? null,
    options: () => options,
    effect: (direction) => effects[direction],
    commit: (effect, direction, key) => {
      const next = effect === "cycle" ? cycleKey(order, key) : dismissKey(order, key);
      const item = byKey.get(key);

      flushSync(() => {
        setState((previous) => ({
          order: next,
          dismissed:
            effect === "dismiss"
              ? new Set([...pruneDismissed(previous.dismissed, keys), key])
              : previous.dismissed,
        }));
      });

      if (item !== undefined) {
        const details = { item, key, direction, effect } as const;

        onSwipe?.(details);

        if (announce !== undefined) {
          const top = next[0] === undefined ? undefined : byKey.get(next[0]);

          setAnnouncement(announce(top, details));
        }
      }

      onOrderChange?.(next);
    },
    commitBack: () => {
      const key = order.at(-1);

      if (key === undefined || order.length < 2) return;

      const next = [key, ...order.slice(0, -1)];
      const item = byKey.get(key);

      flushSync(() => {
        setState((previous) => ({ order: next, dismissed: previous.dismissed }));
      });

      if (item !== undefined) {
        const details = { item, key, effect: "back" } as const;

        onBack?.(details);

        if (announce !== undefined) setAnnouncement(announce(item, details));
      }

      onOrderChange?.(next);
    },
    press: (key) => {
      const item = byKey.get(key);

      if (item !== undefined) onPress?.(item);
    },
    armedChange: (direction) => onArmedChange?.(direction),
  };

  // After the order or the geometry changes the elements go back to where
  // they rest, in the same frame the content moved between them.
  const signature = `${order.join("\u0000")}|${JSON.stringify(options)}`;

  useLayoutEffect(() => {
    engine.sync(host, signature);
  });

  useImperativeHandle(
    actionsRef,
    () => ({
      swipe: (direction) => engine.request(direction),
      back: () => engine.requestBack(),
      settle: () => engine.settle(),
      layout: () => engine.layout(),
      restore: (key) => {
        setState((previous) => ({
          order: [key, ...previous.order.filter((each) => each !== key)],
          dismissed: new Set([...previous.dismissed].filter((each) => each !== key)),
        }));
      },
    }),
    [engine],
  );

  const opens = (direction: SwipeDirection): boolean => {
    const effect: SwipeEffect = effects[direction];

    return effect === "dismiss" ? order.length > 0 : effect === "cycle" && order.length > 1;
  };

  const context: RootContextValue = {
    engine,
    items: ordered,
    keys: order,
    options,
    effects,
    opens,
  };

  const rootState: CardStackRootState = { count: order.length, empty: order.length === 0 };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!keyboard || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    const direction = KEYS[event.key];
    const back = backKeys.includes(event.key);
    const { target } = event;
    const typing =
      target instanceof Element &&
      target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']");

    if ((!direction && !back) || typing) return;

    event.preventDefault();

    // A back key wins over an arrow's swipe, so a stack whose right cycles can
    // give ← to bringing the card back.
    if (back) engine.back();
    else if (direction) engine.swipe(direction);
  };

  return (
    <RootContext value={context}>
      {renderPart(
        "div",
        rootState,
        { className, render },
        {
          "data-empty": rootState.empty ? "" : undefined,
          "data-count": rootState.count,
          onKeyDown,
        },
        {
          ...rest,
          children: (
            <>
              {children}
              {announce === undefined ? null : (
                <span role="status" style={HIDDEN}>
                  {announcement}
                </span>
              )}
            </>
          ),
        },
      )}
    </RootContext>
  );
}
