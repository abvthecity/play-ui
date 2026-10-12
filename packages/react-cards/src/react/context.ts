"use client";

import { createContext, useContext, type Context } from "react";

import type { CardStackEngine } from "../engine.ts";
import type { CardStackOptions, SwipeDirection, SwipeEffects } from "../options.ts";

export interface RootContextValue {
  readonly engine: CardStackEngine;
  /** The items in stack order, top first. */
  readonly items: readonly unknown[];
  readonly keys: readonly string[];
  readonly options: CardStackOptions;
  readonly effects: SwipeEffects;
  /** Whether a swipe that way does anything right now. */
  readonly opens: (direction: SwipeDirection) => boolean;
}

export const RootContext: Context<RootContextValue | null> = createContext<RootContextValue | null>(
  null,
);

export function useRootContext(part: string): RootContextValue {
  const value = useContext(RootContext);

  if (!value) throw new Error(`<CardStack.${part}> must be inside <CardStack.Root>.`);

  return value;
}

/**
 * The context's items as the root's `Item`. A context cannot carry a type
 * parameter, so the one cast between the root and its parts lives here.
 */
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- the caller names the type the root was given.
export function itemsAs<Item>(items: readonly unknown[]): readonly Item[] {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the root stored these as Item; the context erased it.
  return items as readonly Item[];
}

/** The card a part sits in: its depth, 0 at the top. */
export const SlotContext: Context<number | null> = createContext<number | null>(null);

export function useSlotContext(part: string): number {
  const value = useContext(SlotContext);

  if (value === null) throw new Error(`<CardStack.${part}> must be inside a card or an underlay.`);

  return value;
}
