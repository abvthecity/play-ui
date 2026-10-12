import {
  CardStack,
  type CardStackActions,
  type CardStackBackDetails,
  type CardStackOptions,
  type CardStackSwipeDetails,
  type SwipeEffects,
} from "@play-ui/react-cards";
import { Fragment, StrictMode, useEffect, useRef, useState, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

/**
 * `@play-ui/react-cards` in a real browser: the parts' data attributes, the
 * drag as the pointer moves it, the order after a swipe, the keys and the
 * triggers. The package has no styles, so the harness gives it the few a
 * stack needs — a sized stage and cards laid over one another — inline.
 *
 * `reducedMotion: "always"` lands a swipe the moment it is decided, which is
 * what makes most of these synchronous; one case plays the real animations.
 */

interface Link {
  id: string;
  title: string;
}

const LINKS: Link[] = Array.from({ length: 6 }, (_, index) => ({
  id: `l${index}`,
  title: `Link ${index}`,
}));

const LAYER = { position: "absolute", inset: 0 } as const;

function Harness(props: {
  initial?: Link[];
  options?: Partial<CardStackOptions>;
  onSwipe?: (details: CardStackSwipeDetails<Link>) => void;
  onPress?: (link: Link) => void;
  announce?: (
    top: Link | undefined,
    details: CardStackSwipeDetails<Link> | CardStackBackDetails<Link>,
  ) => string;
  removeOnDismiss?: boolean;
  effects?: Partial<SwipeEffects>;
  backKeys?: readonly string[];
  onBack?: (details: CardStackBackDetails<Link>) => void;
  actionsRef?: { current: CardStackActions | null };
}): ReactElement {
  const [links, setLinks] = useState(props.initial ?? LINKS);

  return (
    <CardStack.Root
      items={links}
      getKey={(link) => link.id}
      options={{ reducedMotion: "always", ...props.options }}
      onPress={props.onPress}
      announce={props.announce}
      effects={props.effects}
      backKeys={props.backKeys}
      onBack={props.onBack}
      actionsRef={props.actionsRef}
      onSwipe={(details) => {
        props.onSwipe?.(details);

        if (props.removeOnDismiss && details.effect === "dismiss") {
          setLinks((previous) => previous.filter((link) => link.id !== details.key));
        }
      }}
      data-testid="root"
    >
      <CardStack.Stage
        data-testid="stage"
        style={{ position: "relative", width: 200, height: 280 }}
      >
        <CardStack.Underlays style={LAYER} data-testid="underlay" />
        <CardStack.Cards style={LAYER} className={(state) => `card card-${state.slot}`}>
          {(link: Link) => (
            // Keyed by link, as the README asks: a card's content remounts when it moves up.
            <Fragment key={link.id}>
              <h2>{link.title}</h2>
              <CardStack.Indicator direction="right" data-testid="done">
                Done
              </CardStack.Indicator>
              <CardStack.Shade style={LAYER} />
            </Fragment>
          )}
        </CardStack.Cards>
      </CardStack.Stage>
      <CardStack.Trigger direction="left">Keep</CardStack.Trigger>
      <CardStack.Trigger direction="right">Done</CardStack.Trigger>
      <Add onAdd={(link) => setLinks((previous) => [...previous, link])} />
    </CardStack.Root>
  );
}

/** Swipes right once on mount, from inside an effect rather than an event. */
function SwipesOnMount(): ReactElement {
  const actions = useRef<CardStackActions>(null);

  useEffect(() => {
    actions.current?.swipe("right");
  }, []);

  return (
    <CardStack.Root
      items={LINKS}
      getKey={(link) => link.id}
      options={{ reducedMotion: "always" }}
      actionsRef={actions}
    >
      <CardStack.Stage style={{ position: "relative", width: 200, height: 280 }}>
        <CardStack.Cards style={LAYER}>
          {(link: Link) => <h2 key={link.id}>{link.title}</h2>}
        </CardStack.Cards>
      </CardStack.Stage>
    </CardStack.Root>
  );
}

function Add(props: { onAdd: (link: Link) => void }): ReactElement {
  return (
    <button
      type="button"
      data-no-swipe
      onClick={() => props.onAdd({ id: "new", title: "New link" })}
    >
      Add
    </button>
  );
}

function status(): string | null | undefined {
  return document.querySelector("[role='status']")?.textContent;
}

function stage(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-testid="stage"]');

  if (!element) throw new Error("no stage");

  return element;
}

function topTitle(): string | null | undefined {
  return document.querySelector('[data-slot="top"] h2')?.textContent;
}

function topTransform(): string | undefined {
  return document.querySelector<HTMLElement>('[data-slot="top"]')?.style.transform;
}

function pointer(type: string, x: number, y = 140, held = type !== "pointerup"): void {
  const rect = stage().getBoundingClientRect();

  stage().dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 7,
      pointerType: "mouse",
      button: 0,
      buttons: held ? 1 : 0,
      clientX: rect.left + x,
      clientY: rect.top + y,
    }),
  );
}

/** Down in the middle, moves to `to` in steps, and optionally lets go. */
function drag(to: number, release = true): void {
  pointer("pointerdown", 100);

  for (let step = 1; step <= 6; step += 1) pointer("pointermove", 100 + ((to - 100) * step) / 6);

  if (release) pointer("pointerup", to);
}

function key(name: string): void {
  stage().dispatchEvent(
    new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }),
  );
}

function button(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find(
    (element) => element.textContent === name,
  );

  if (!found) throw new Error(`no ${name} button`);

  return found;
}

describe("CardStack", () => {
  it("draws the top card, the one beneath it, and planes down to maxDepth", async () => {
    await render(<Harness />);

    expect(topTitle()).toBe("Link 0");
    expect(document.querySelector('[data-slot="next"] h2')?.textContent).toBe("Link 1");
    expect(document.querySelector('[data-slot="next"]')?.getAttribute("aria-hidden")).toBe("true");
    expect(
      [...document.querySelectorAll<HTMLElement>('[data-testid="underlay"]')].map(
        (plane) => plane.dataset.depth,
      ),
    ).toEqual(["3", "2"]);
    expect(document.querySelector('[data-slot="top"]')?.className).toBe("card card-top");
    expect(document.querySelector('[data-testid="root"]')?.getAttribute("data-count")).toBe("6");
    expect(stage().style.touchAction).toBe("pan-y");
  });

  it("says which way a drag is heading and when it has crossed the threshold", async () => {
    await render(<Harness />);

    drag(130, false);

    const indicator = document.querySelector<HTMLElement>('[data-slot="top"] [data-testid="done"]');

    expect(stage().dataset.swiping).toBe("right");
    expect(stage().dataset.armed).toBeUndefined();
    expect(indicator?.dataset.active).toBe("");
    expect(Number(indicator?.style.getPropertyValue("--card-stack-progress"))).toBeGreaterThan(0);

    pointer("pointermove", 190);

    expect(stage().dataset.armed).toBe("");
    expect(indicator?.dataset.armed).toBe("");

    pointer("pointerup", 190);
  });

  it("dismisses on a drag right past the threshold", async () => {
    const onSwipe = vi.fn();

    await render(<Harness onSwipe={onSwipe} />);

    drag(190);

    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({ key: "l0", direction: "right", effect: "dismiss" }),
    );
    expect(topTitle()).toBe("Link 1");
    expect(document.querySelector('[data-testid="root"]')?.getAttribute("data-count")).toBe("5");
    expect(stage().dataset.swiping).toBeUndefined();
  });

  it("cycles on a drag left: the top card goes to the bottom", async () => {
    const onSwipe = vi.fn();

    await render(<Harness onSwipe={onSwipe} />);

    drag(10);

    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({ key: "l0", direction: "left", effect: "cycle" }),
    );
    expect(topTitle()).toBe("Link 1");
    expect(document.querySelector('[data-testid="root"]')?.getAttribute("data-count")).toBe("6");

    for (let turn = 0; turn < 5; turn += 1) button("Keep").click();

    expect(topTitle()).toBe("Link 0");
  });

  it("springs back from a short drag and does nothing", async () => {
    const onSwipe = vi.fn();

    await render(<Harness onSwipe={onSwipe} />);

    // Synthetic events a microsecond apart read as a fling; let the pointer
    // come to rest first, as a hand does before it lets go.
    drag(130, false);
    await new Promise((resolve) => setTimeout(resolve, 120));
    pointer("pointermove", 130);
    pointer("pointerup", 130);

    expect(onSwipe).not.toHaveBeenCalled();
    expect(topTitle()).toBe("Link 0");
  });

  it("lets go of a card released off the page, rather than leaving it on the cursor", async () => {
    const onSwipe = vi.fn();

    await render(<Harness onSwipe={onSwipe} />);

    // Dragged most of the way, then the button comes up outside the window,
    // which sends no pointerup; the next move arrives with nothing held.
    drag(130, false);
    await new Promise((resolve) => setTimeout(resolve, 120));
    pointer("pointermove", 130, 140, false);

    // Released there: moving on with nothing held no longer drags it.
    pointer("pointermove", 420, 140, false);
    pointer("pointerup", 420);
    expect(onSwipe).not.toHaveBeenCalled();

    // And the stack still answers the next drag.
    drag(420);
    await expect.poll(() => onSwipe.mock.calls.length).toBe(1);
  });

  it("lets go of a card when the window loses focus mid-drag", async () => {
    const onSwipe = vi.fn();

    await render(<Harness onSwipe={onSwipe} />);

    drag(130, false);
    window.dispatchEvent(new Event("blur"));
    pointer("pointermove", 400);
    pointer("pointerup", 400);

    expect(onSwipe).not.toHaveBeenCalled();
    expect(topTitle()).toBe("Link 0");
  });

  it("takes the arrow keys while focus is inside", async () => {
    await render(<Harness />);

    stage().focus();
    stage().dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );

    expect(topTitle()).toBe("Link 1");

    stage().dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }),
    );

    expect(topTitle()).toBe("Link 2");
  });

  it("announces the new top card after a swipe, and nothing without announce", async () => {
    const quiet = await render(<Harness />);

    expect(quiet.container.querySelector("[role='status']")).toBeNull();
    await quiet.unmount();

    await render(
      <Harness
        initial={LINKS.slice(0, 2)}
        announce={(top, details) =>
          top === undefined ? "Nothing left" : `${details.item.title} gone, ${top.title} on top`
        }
      />,
    );

    expect(status()).toBe("");

    stage().focus();
    stage().dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );

    await expect.poll(status).toBe("Link 0 gone, Link 1 on top");

    stage().dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );

    await expect.poll(status).toBe("Nothing left");
  });

  it("with one card left, will not cycle, and a dismiss empties it", async () => {
    await render(<Harness initial={[{ id: "only", title: "Only" }]} />);

    expect(button("Keep").disabled).toBe(true);
    expect(button("Keep").dataset.disabled).toBe("");

    drag(10);

    expect(topTitle()).toBe("Only");

    button("Done").click();

    expect(document.querySelector('[data-testid="root"]')?.hasAttribute("data-empty")).toBe(true);
    expect(stage().hasAttribute("data-empty")).toBe(true);
    expect(topTitle()).toBeUndefined();
  });

  it("keeps a dismissed card out whether or not the owner removes it, and puts new ones at the bottom", async () => {
    await render(<Harness />);

    button("Done").click();
    button("Add").click();

    await expect
      .poll(() => document.querySelector('[data-testid="root"]')?.getAttribute("data-count"))
      .toBe("6");
    expect(topTitle()).toBe("Link 1");

    for (let turn = 0; turn < 5; turn += 1) button("Keep").click();

    expect(topTitle()).toBe("New link");
  });

  it("follows a drag by the vertical share and the resistance its options give", async () => {
    await render(
      <Harness effects={{ left: "none" }} options={{ dragFollowY: 1, resistExponent: 1 }} />,
    );

    // Sideways first, so the gesture locks to the horizontal axis.
    pointer("pointerdown", 100);
    pointer("pointermove", 130);
    pointer("pointermove", 160, 180);

    expect(topTransform()).toContain("translate3d(60px, 40px, 0px)");

    pointer("pointermove", 40);

    // Left is closed, and an exponent of 1 lets it follow the pointer anyway.
    expect(topTransform()).toContain("translate3d(-60px, 0px, 0px)");

    pointer("pointerup", 100);
  });

  it("hands a tap to onPress rather than swiping", async () => {
    const onPress = vi.fn();

    await render(<Harness onPress={onPress} />);

    pointer("pointerdown", 100);
    pointer("pointerup", 101);

    expect(onPress).toHaveBeenCalledWith(LINKS[0]);
  });

  it("gives a new top card's indicators no progress to fade from", async () => {
    // A consumer's wash: opacity from the drag's progress, eased whenever it changes.
    const style = document.createElement("style");

    style.textContent =
      "[data-testid=done] { opacity: var(--card-stack-progress, 0); transition: opacity 1s linear; }";
    document.head.append(style);

    await render(<Harness />);

    drag(190);

    const indicator = document.querySelector<HTMLElement>('[data-slot="top"] [data-testid="done"]');

    expect(topTitle()).toBe("Link 1");
    expect(indicator?.style.getPropertyValue("--card-stack-progress")).toBe("0");
    // Registered before styles were first read, so there was never a 1 to ease from.
    expect(indicator?.getAnimations()).toHaveLength(0);

    style.remove();
  });

  it("still drags under StrictMode, whose double effects detach and reattach the stage", async () => {
    const onSwipe = vi.fn();

    await render(
      <StrictMode>
        <Harness onSwipe={onSwipe} />
      </StrictMode>,
    );

    drag(190);

    expect(onSwipe).toHaveBeenCalledTimes(1);
    expect(topTitle()).toBe("Link 1");
  });

  it("plays a real swipe through to its landing", async () => {
    const onSwipe = vi.fn();

    await render(
      <Harness
        onSwipe={onSwipe}
        removeOnDismiss
        options={{ reducedMotion: "never", timeScale: 0.1 }}
      />,
    );

    const top = document.querySelector<HTMLElement>('[data-slot="top"]');

    button("Done").click();

    expect(top?.getAnimations().length).toBeGreaterThan(0);

    await expect.poll(() => onSwipe.mock.calls.length).toBe(1);

    expect(topTitle()).toBe("Link 1");
    expect(top?.getAnimations()).toHaveLength(0);
    expect(top?.style.transform).toContain("translate3d(0px, 0px, 0px)");
  });

  it("brings the bottom card back to the top with a back key, and the arrows still swipe", async () => {
    const onBack = vi.fn();

    await render(<Harness backKeys={["ArrowUp"]} onBack={onBack} />);

    stage().focus();
    key("ArrowLeft");

    expect(topTitle()).toBe("Link 1");

    key("ArrowUp");

    expect(topTitle()).toBe("Link 0");
    expect(document.querySelector('[data-slot="next"] h2')?.textContent).toBe("Link 1");
    expect(onBack).toHaveBeenCalledWith({ item: LINKS[0], key: "l0", effect: "back" });

    // Nothing was cycled this time: the bottom card is the list's last.
    key("ArrowUp");

    expect(topTitle()).toBe("Link 5");
    expect(document.querySelector('[data-testid="root"]')?.getAttribute("data-count")).toBe("6");
  });

  it("gives a back key the arrow's place, so the left and right arrows can be a pair", async () => {
    const onSwipe = vi.fn();

    await render(
      <Harness
        effects={{ left: "none", right: "cycle" }}
        backKeys={["ArrowLeft"]}
        onSwipe={onSwipe}
      />,
    );

    stage().focus();
    key("ArrowRight");
    key("ArrowRight");

    expect(topTitle()).toBe("Link 2");

    key("ArrowLeft");

    expect(topTitle()).toBe("Link 1");

    key("ArrowLeft");

    expect(topTitle()).toBe("Link 0");
    expect(onSwipe).toHaveBeenCalledTimes(2);
  });

  it("announces the card brought back, and will not bring one back from a stack of one", async () => {
    const actions: { current: CardStackActions | null } = { current: null };

    const view = await render(
      <Harness
        initial={LINKS.slice(0, 2)}
        actionsRef={actions}
        announce={(top, details) =>
          details.effect === "back" ? `${details.item.title} back` : (top?.title ?? "")
        }
      />,
    );

    expect(actions.current?.back()).toBe(true);
    await expect.poll(topTitle).toBe("Link 1");
    await expect.poll(status).toBe("Link 1 back");

    await view.unmount();
    await render(<Harness initial={[{ id: "only", title: "Only" }]} actionsRef={actions} />);

    expect(actions.current?.back()).toBe(false);
    expect(topTitle()).toBe("Only");
  });

  it("plays a real return: out from beneath the stack, and home in front", async () => {
    await render(
      <Harness backKeys={["ArrowUp"]} options={{ reducedMotion: "never", timeScale: 2 }} />,
    );

    const top = document.querySelector<HTMLElement>('[data-slot="top"]');

    stage().focus();
    key("ArrowUp");

    // The order moves first, so the card on its way is already the real one.
    expect(topTitle()).toBe("Link 5");
    expect(top?.getAnimations().length).toBeGreaterThan(0);
    // Behind the stack it is coming out of, until its turn.
    expect(top?.style.zIndex).toBe("0");

    await expect.poll(() => top?.style.zIndex, { timeout: 3000 }).toBe("100");
    await expect.poll(() => top?.getAnimations().length, { timeout: 5000 }).toBe(0);

    expect(top?.style.transform).toContain("translate3d(0px, 0px, 0px)");
  });

  it("lands a return at once under reduced motion", async () => {
    await render(<Harness backKeys={["ArrowUp"]} />);

    const top = document.querySelector<HTMLElement>('[data-slot="top"]');

    stage().focus();
    key("ArrowUp");

    expect(topTitle()).toBe("Link 5");
    expect(top?.getAnimations()).toHaveLength(0);
    expect(top?.style.zIndex).toBe("100");
  });

  // A reduced-motion swipe used to flush React synchronously, which React
  // warns about when the call comes from inside an effect.
  it("lands a reduced-motion swipe called from an effect without React's warning", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await render(<SwipesOnMount />);

    await expect.poll(() => topTitle()).toBe("Link 1");
    expect(errors.mock.calls.flat().join(" ")).not.toContain("flushSync");

    errors.mockRestore();
  });
});
