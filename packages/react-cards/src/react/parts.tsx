"use client";

import { renderPart, type PartProps } from "@play-ui/utils";
import {
  useCallback,
  useContext,
  useLayoutEffect,
  type ComponentPropsWithRef,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import type { VerticalDragEvent } from "../engine.ts";
import type { SwipeDirection, SwipeEffect } from "../options.ts";
import { itemsAs, RootContext, SlotContext, useRootContext, useSlotContext } from "./context.ts";

// -----------------------------------------------------------------------------
// Stage
// -----------------------------------------------------------------------------

export interface CardStackStageState {
  readonly count: number;
  readonly empty: boolean;
}

export interface CardStackStageProps
  extends Omit<ComponentPropsWithRef<"div">, "className">, PartProps<CardStackStageState> {
  /**
   * A drag that locked to the vertical axis — to pull a sheet closed, say.
   * Without it a vertical drag is left to the page, which keeps scrolling.
   */
  onVerticalDrag?: ((event: VerticalDragEvent) => void) | undefined;
}

/**
 * The surface a drag starts on, and the box the cards stack in. Renders a
 * focusable `<div>`; put `Underlays` and `Cards` inside it.
 *
 * The one style it sets is `touch-action` — `pan-y` so a page still scrolls
 * past the stack, or `none` when `onVerticalDrag` is given.
 *
 * Data attributes, written as the drag moves: `data-swiping="left|right"`,
 * `data-armed` past the threshold. CSS variables: `--card-stack-progress`
 * (0 to 1 toward the threshold) and `--card-stack-offset` (px).
 */
export function CardStackStage(props: CardStackStageProps): ReactElement {
  const { className, render, style, onVerticalDrag, ...rest } = props;
  const { engine, keys } = useRootContext("Stage");
  const verticalDrag = onVerticalDrag !== undefined;

  useLayoutEffect(() => {
    engine.setVerticalDrag(onVerticalDrag ?? null);
  });

  useLayoutEffect(() => () => engine.setVerticalDrag(null), [engine]);
  const attach = useCallback(
    (element: HTMLDivElement | null) => engine.setStage(element),
    [engine],
  );

  useLayoutEffect(() => {
    engine.mountStage();
  }, [engine]);

  const state: CardStackStageState = { count: keys.length, empty: keys.length === 0 };

  return renderPart(
    "div",
    state,
    { className, render },
    { ref: attach, tabIndex: 0, "data-empty": state.empty ? "" : undefined },
    { ...rest, style: { touchAction: verticalDrag ? "none" : "pan-y", ...style } },
  );
}

// -----------------------------------------------------------------------------
// Cards
// -----------------------------------------------------------------------------

export interface CardStackCardState {
  /** `top` is the card in front; `next` is the one beneath it. */
  readonly slot: "top" | "next";
  readonly depth: 0 | 1;
  readonly key: string;
}

export interface CardStackCardsProps<Item>
  extends
    Omit<ComponentPropsWithRef<"div">, "className" | "children" | "ref">,
    PartProps<CardStackCardState> {
  /** A card's content. Called for the top card and the one beneath it. */
  children: (item: Item, state: CardStackCardState) => ReactNode;
}

/**
 * The two real cards: the top one and the one beneath it, each a `<div>`.
 *
 * The elements stay put while their content moves between them, which is how
 * a swipe lands without a visible jump; key your content by item if it holds
 * state of its own. The card beneath is `inert` and `aria-hidden`.
 *
 * Data attributes: `data-slot="top|next"`, `data-depth`.
 */
export function CardStackCards<Item>(props: CardStackCardsProps<Item>): ReactElement {
  const { items: stored, keys } = useRootContext("Cards");
  const items = itemsAs<Item>(stored);

  return (
    <>
      {([1, 0] as const).map((depth) => {
        const key = keys[depth];
        const item = items[depth];

        if (key === undefined || item === undefined) return null;

        return <CardSlot key={depth} depth={depth} item={item} itemKey={key} part={props} />;
      })}
    </>
  );
}

function CardSlot<Item>(slot: {
  depth: 0 | 1;
  item: Item;
  itemKey: string;
  part: CardStackCardsProps<Item>;
}): ReactElement {
  const { depth, item, itemKey, part } = slot;
  const { children, className, render, ...rest } = part;
  const { engine } = useRootContext("Cards");
  const attach = useCallback(
    (element: HTMLDivElement | null) => engine.setSlot(depth, element),
    [engine, depth],
  );
  const state: CardStackCardState = { slot: depth === 0 ? "top" : "next", depth, key: itemKey };

  return (
    <SlotContext value={depth}>
      {renderPart(
        "div",
        state,
        { className, render },
        {
          ref: attach,
          "data-slot": state.slot,
          "data-depth": depth,
          "aria-hidden": depth === 0 ? undefined : true,
          inert: depth === 0 ? undefined : true,
        },
        { ...rest, children: children(item, state) },
      )}
    </SlotContext>
  );
}

// -----------------------------------------------------------------------------
// Underlays
// -----------------------------------------------------------------------------

export interface CardStackUnderlayState {
  /** 2 for the first plane beneath the next card, and so on. */
  readonly depth: number;
}

export interface CardStackUnderlaysProps
  extends
    Omit<ComponentPropsWithRef<"div">, "className" | "children" | "ref">,
    PartProps<CardStackUnderlayState> {
  children?: ((state: CardStackUnderlayState) => ReactNode) | undefined;
}

/**
 * The planes beneath the two real cards, one `<div>` per depth from 2 to
 * `maxDepth`, never more than the stack has cards for. They carry no content
 * of their own unless `children` gives them some. `aria-hidden`.
 *
 * Data attribute: `data-depth`.
 */
export function CardStackUnderlays(props: CardStackUnderlaysProps): ReactElement {
  const { keys, options } = useRootContext("Underlays");
  const deepest = Math.min(keys.length - 1, options.maxDepth);
  const depths: number[] = [];

  for (let depth = deepest; depth >= 2; depth -= 1) depths.push(depth);

  return (
    <>
      {depths.map((depth) => (
        <UnderlaySlot key={depth} depth={depth} part={props} />
      ))}
    </>
  );
}

function UnderlaySlot(slot: { depth: number; part: CardStackUnderlaysProps }): ReactElement {
  const { depth, part } = slot;
  const { children, className, render, ...rest } = part;
  const { engine } = useRootContext("Underlays");
  const attach = useCallback(
    (element: HTMLDivElement | null) => engine.setSlot(depth, element),
    [engine, depth],
  );
  const state: CardStackUnderlayState = { depth };

  return (
    <SlotContext value={depth}>
      {renderPart(
        "div",
        state,
        { className, render },
        { ref: attach, "data-depth": depth, "aria-hidden": true },
        { ...rest, children: children?.(state) },
      )}
    </SlotContext>
  );
}

// -----------------------------------------------------------------------------
// Shade
// -----------------------------------------------------------------------------

export interface CardStackShadeState {
  readonly depth: number;
}

export interface CardStackShadeProps
  extends Omit<ComponentPropsWithRef<"div">, "className">, PartProps<CardStackShadeState> {}

/**
 * A layer inside a card whose opacity the stack drives: 0 at the front and
 * `depthShade` more per depth. Give it a colour and a place; it has neither.
 */
export function CardStackShade(props: CardStackShadeProps): ReactElement {
  const { className, render, ...rest } = props;
  const { engine } = useRootContext("Shade");
  const depth = useSlotContext("Shade");
  const attach = useCallback(
    (element: HTMLDivElement | null) => engine.setShade(depth, element),
    [engine, depth],
  );

  return renderPart(
    "div",
    { depth },
    { className, render },
    { ref: attach, "aria-hidden": true },
    rest,
  );
}

// -----------------------------------------------------------------------------
// Indicator
// -----------------------------------------------------------------------------

export interface CardStackIndicatorState {
  readonly direction: SwipeDirection;
  readonly effect: SwipeEffect;
}

export interface CardStackIndicatorProps
  extends Omit<ComponentPropsWithRef<"div">, "className">, PartProps<CardStackIndicatorState> {
  /** The drag it answers to. */
  direction: SwipeDirection;
}

/**
 * A label for what a swipe will do, inside a card. Only the top card's
 * indicators respond.
 *
 * Data attributes: `data-direction`, `data-effect`, `data-active` while the
 * drag heads its way, `data-armed` past the threshold. CSS variable:
 * `--card-stack-progress`, 0 to 1 toward the threshold — fade it in with that.
 */
export function CardStackIndicator(props: CardStackIndicatorProps): ReactElement {
  const { direction, className, render, ...rest } = props;
  const { engine, effects } = useRootContext("Indicator");
  const depth = useSlotContext("Indicator");
  // Registered the moment the element attaches, not an effect later: a new
  // card's indicator must carry its own progress of 0 before anything reads
  // styles, or it inherits the stage's armed progress for a frame and a
  // consumer's opacity transition plays from it.
  const attach = useCallback(
    (element: HTMLDivElement | null) =>
      element ? engine.addIndicator(depth, direction, element) : undefined,
    [engine, depth, direction],
  );

  const state: CardStackIndicatorState = { direction, effect: effects[direction] };

  return renderPart(
    "div",
    state,
    { className, render },
    {
      ref: attach,
      "aria-hidden": true,
      "data-direction": direction,
      "data-effect": state.effect,
    },
    rest,
  );
}

// -----------------------------------------------------------------------------
// Trigger
// -----------------------------------------------------------------------------

export interface CardStackTriggerState {
  readonly direction: SwipeDirection;
  readonly effect: SwipeEffect;
  readonly disabled: boolean;
}

export interface CardStackTriggerProps
  extends Omit<ComponentPropsWithRef<"button">, "className">, PartProps<CardStackTriggerState> {
  direction: SwipeDirection;
}

/**
 * A button that swipes the top card one way. Disabled while that way does
 * nothing: an empty stack, a closed direction, or a cycle with one card left.
 *
 * Data attributes: `data-direction`, `data-effect`, `data-disabled`.
 */
export function CardStackTrigger(props: CardStackTriggerProps): ReactElement {
  const { direction, className, render, disabled: disabledProp, ...rest } = props;
  const { engine, effects, opens } = useRootContext("Trigger");
  const disabled = disabledProp === true || !opens(direction);
  const state: CardStackTriggerState = { direction, effect: effects[direction], disabled };

  return renderPart(
    "button",
    state,
    { className, render },
    {
      type: "button",
      disabled,
      "data-direction": direction,
      "data-effect": state.effect,
      "data-disabled": disabled ? "" : undefined,
      onClick: (_event: MouseEvent<HTMLButtonElement>) => {
        engine.swipe(direction);
      },
    },
    rest,
  );
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export interface CardStackApi<Item> {
  /** The items in stack order, top first. */
  readonly items: readonly Item[];
  readonly top: Item | undefined;
  readonly count: number;
  swipe(direction: SwipeDirection): boolean;
  /** The bottom card back to the top; false with fewer than two cards. */
  back(): boolean;
  settle(): void;
}

/** The stack around the calling component, for counts, empty states and custom controls. */
export function useCardStack<Item>(): CardStackApi<Item> {
  const context = useContext(RootContext);

  if (!context) throw new Error("useCardStack() must be called inside <CardStack.Root>.");

  const { engine } = context;
  const items = itemsAs<Item>(context.items);

  return {
    items,
    top: items[0],
    count: items.length,
    swipe: (direction) => engine.swipe(direction),
    back: () => engine.back(),
    settle: () => engine.settle(),
  };
}
