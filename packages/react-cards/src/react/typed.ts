import type { ReactElement } from "react";

import * as parts from "./namespace.ts";
import { useCardStack, type CardStackApi, type CardStackCardsProps } from "./parts.tsx";
import type { CardStackRootProps } from "./root.tsx";

/**
 * The parts with the item type fixed, so `Cards` and `useCardStack` know it
 * without being told at every call site. The parts that never see an item are
 * the same components as on `CardStack`.
 */
export interface TypedCardStack<Item> {
  readonly Root: (props: CardStackRootProps<Item>) => ReactElement;
  readonly Cards: (props: CardStackCardsProps<Item>) => ReactElement;
  readonly Stage: typeof parts.Stage;
  readonly Underlays: typeof parts.Underlays;
  readonly Shade: typeof parts.Shade;
  readonly Indicator: typeof parts.Indicator;
  readonly Trigger: typeof parts.Trigger;
  readonly useCardStack: () => CardStackApi<Item>;
}

/**
 * `CardStack`, typed for one kind of item. Context cannot carry a type from
 * `Root` down to `Cards`, so a stack built from `CardStack` annotates its
 * callback's parameter — and an annotation is a claim nothing checks. This
 * fixes `Item` once, where the stack is declared:
 *
 * ```tsx
 * const LinkStack = createCardStack<Link>();
 *
 * <LinkStack.Root items={links} getKey={(link) => link.id}>
 *   <LinkStack.Stage>
 *     <LinkStack.Cards>{(link) => <h2>{link.title}</h2>}</LinkStack.Cards>
 *   </LinkStack.Stage>
 * </LinkStack.Root>
 * ```
 *
 * Nothing is created at runtime: every part is the same component as on
 * `CardStack`, so the two can be mixed inside one root.
 */
export function createCardStack<Item>(): TypedCardStack<Item> {
  return {
    Root: parts.Root,
    Cards: parts.Cards,
    Stage: parts.Stage,
    Underlays: parts.Underlays,
    Shade: parts.Shade,
    Indicator: parts.Indicator,
    Trigger: parts.Trigger,
    useCardStack,
  };
}
