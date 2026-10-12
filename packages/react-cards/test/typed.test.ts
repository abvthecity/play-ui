import {
  CardStack,
  createCardStack,
  useCardStack,
  type CardStackApi,
  type CardStackCardsProps,
  type CardStackRootProps,
} from "@play-ui/react-cards";
import { describe, expect, expectTypeOf, it } from "vitest";

interface Link {
  id: string;
  title: string;
}

interface Other {
  name: number;
}

const LinkStack = createCardStack<Link>();

/** Written with no annotation: `link` is a `Link` because the props say so. */
const children: CardStackCardsProps<Link>["children"] = (link) => link.title;

/** A card callback for some other item. */
const wrong = (other: Other): string => String(other.name);

/**
 * `createCardStack` fixes the item type once, so a stack's card callback is
 * checked against the items it was given rather than taking an annotation on
 * trust. The type half is enforced by `tsc`, which the gate runs over this
 * file; the runtime half is that nothing new is made.
 */
describe("createCardStack", () => {
  it("hands back the same parts as CardStack, so the two mix inside one root", () => {
    expect(LinkStack.Root).toBe(CardStack.Root);
    expect(LinkStack.Cards).toBe(CardStack.Cards);
    expect(LinkStack.Stage).toBe(CardStack.Stage);
    expect(LinkStack.Underlays).toBe(CardStack.Underlays);
    expect(LinkStack.Shade).toBe(CardStack.Shade);
    expect(LinkStack.Indicator).toBe(CardStack.Indicator);
    expect(LinkStack.Trigger).toBe(CardStack.Trigger);
    expect(LinkStack.useCardStack).toBe(useCardStack);
  });

  it("types the card callback's item without an annotation", () => {
    expectTypeOf<Parameters<CardStackCardsProps<Link>["children"]>[0]>().toEqualTypeOf<Link>();
    expectTypeOf(LinkStack.Cards).parameter(0).toEqualTypeOf<CardStackCardsProps<Link>>();

    expect(children({ id: "a", title: "A" }, { slot: "top", depth: 0, key: "a" })).toBe("A");
  });

  it("refuses a callback written for another item", () => {
    // @ts-expect-error — a card callback for `Other` on a stack of `Link`.
    const props: Parameters<typeof LinkStack.Cards>[0] = { children: wrong };

    expect(props.children).toBe(wrong);
  });

  it("types the root's items and the hook's answer", () => {
    expectTypeOf(LinkStack.Root).parameter(0).toEqualTypeOf<CardStackRootProps<Link>>();
    expectTypeOf(LinkStack.useCardStack).returns.toEqualTypeOf<CardStackApi<Link>>();

    const root: Pick<Parameters<typeof LinkStack.Root>[0], "items" | "getKey"> = {
      // @ts-expect-error — the root of a stack of `Link` takes only links.
      items: [{ name: 1 }],
      getKey: (link) => link.id,
    };

    expect(root.getKey({ id: "b", title: "B" })).toBe("b");
  });
});
