import { useState, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Deck, openDeck, type DeckForm, type DeckRootProps } from "../index.ts";

/**
 * `@play-ui/react-deck` in a real browser: the phases, the tab list, the
 * keys, the dialog and the events. The package has no styles, so the harness
 * sizes the pile and the sheet inline, enough for a flight to have boxes to
 * fly between.
 */

const FACETS = ["about", "notes", "links"] as const;

function Harness(props: Partial<DeckRootProps> & { form?: DeckForm }): ReactElement {
  return (
    <Deck.Root values={FACETS} reducedMotion="always" {...props}>
      <Deck.Pile aria-label="Open the folder" style={{ width: 200, height: 120 }}>
        <Deck.PileCard style={{ display: "block", width: 200, height: 120 }}>About</Deck.PileCard>
      </Deck.Pile>
      <Deck.Backdrop data-testid="backdrop" />
      <Deck.Folder aria-label="About this page">
        <Deck.Tabs aria-label="Facets">
          {FACETS.map((facet) => (
            <Deck.Tab key={facet} value={facet}>
              {facet}
            </Deck.Tab>
          ))}
        </Deck.Tabs>
        <Deck.Surface style={{ width: 320, height: 400 }}>
          <Deck.Close aria-label="Put the folder away">×</Deck.Close>
          {FACETS.map((facet) => (
            <Deck.Panel key={facet} value={facet}>
              <p>The {facet} facet</p>
              <input aria-label={`Field in ${facet}`} />
            </Deck.Panel>
          ))}
        </Deck.Surface>
      </Deck.Folder>
    </Deck.Root>
  );
}

function Controlled(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Outside
      </button>
      <Harness open={open} onOpenChange={setOpen} value="notes" />
    </>
  );
}

function WithStep(): ReactElement {
  const [step, setStep] = useState(true);

  return (
    <Deck.Root values={FACETS} reducedMotion="always" defaultOpen form="sheet">
      <Deck.Folder aria-label="Deck">
        <Deck.Surface>
          {step ? (
            <Deck.Step aria-label="Confirm" onClose={() => setStep(false)}>
              <button type="button">Confirm</button>
            </Deck.Step>
          ) : (
            <p>Step closed</p>
          )}
        </Deck.Surface>
      </Deck.Folder>
    </Deck.Root>
  );
}

const root = (container: HTMLElement): HTMLElement => {
  const element = container.firstElementChild;

  if (!(element instanceof HTMLElement)) throw new Error("expected the root");

  return element;
};

const press = (key: string, target: EventTarget = document.body): void => {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
};

describe("Deck.Root", () => {
  it("deals from the pile onto the first facet and puts the deck away again", async () => {
    const onOpenChange = vi.fn();
    const screen = await render(<Harness onOpenChange={onOpenChange} />);
    const element = root(screen.container);

    expect(element.dataset["phase"]).toBe("put-away");
    expect(screen.container.querySelector("[role='region']")).toBeNull();

    await screen.getByRole("button", { name: "Open the folder" }).click();

    await expect.poll(() => element.dataset["phase"]).toBe("dealt");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await expect.element(screen.getByRole("region", { name: "About this page" })).toBeVisible();
    await expect.element(screen.getByRole("tab", { name: "about" })).toHaveFocus();
    await expect.element(screen.getByRole("tabpanel")).toHaveTextContent("The about facet");

    // The pile stays in the page as the box to land on, hidden from everyone.
    const pile = screen.container.querySelector("button[aria-expanded]");

    expect(pile?.hasAttribute("inert")).toBe(true);
    expect(pile?.hasAttribute("data-hidden")).toBe(true);

    await screen.getByRole("button", { name: "Put the folder away" }).click();

    await expect.poll(() => element.dataset["phase"]).toBe("put-away");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await expect.element(screen.getByRole("button", { name: "Open the folder" })).toHaveFocus();
  });

  it("flips facets from the tabs, with the arrow keys walking them", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<Harness defaultOpen onValueChange={onValueChange} />);

    await screen.getByRole("tab", { name: "links" }).click();

    await expect.element(screen.getByRole("tabpanel")).toHaveTextContent("The links facet");
    expect(onValueChange).toHaveBeenLastCalledWith("links");

    const links = screen.getByRole("tab", { name: "links" });

    await expect.element(links).toHaveAttribute("aria-selected", "true");
    await expect.element(links).toHaveAttribute("data-selected", "");

    press("ArrowDown", links.element());

    await expect.element(screen.getByRole("tab", { name: "about" })).toHaveFocus();
    await expect.element(screen.getByRole("tabpanel")).toHaveTextContent("The about facet");
  });

  it("deals on i, flips on a number and puts away on Escape, but not from a field", async () => {
    const screen = await render(<Harness />);
    const element = root(screen.container);

    press("2");

    await expect.poll(() => element.dataset["phase"]).toBe("dealt");
    await expect.element(screen.getByRole("tabpanel")).toHaveTextContent("The notes facet");

    press("i", screen.getByRole("textbox").element());
    expect(element.dataset["phase"]).toBe("dealt");

    press("Escape");
    await expect.poll(() => element.dataset["phase"]).toBe("put-away");

    press("i");
    await expect.poll(() => element.dataset["phase"]).toBe("dealt");
  });

  it("binds no keys when told not to", async () => {
    const screen = await render(<Harness keys={false} />);

    press("i");
    press("1");

    expect(root(screen.container).dataset["phase"]).toBe("put-away");
  });

  it("opens on openDeck when listening, on the facet asked for", async () => {
    const screen = await render(<Harness listen />);

    openDeck("links");

    await expect.poll(() => root(screen.container).dataset["phase"]).toBe("dealt");
    await expect.element(screen.getByRole("tabpanel")).toHaveTextContent("The links facet");
  });

  it("follows its open and value props when controlled", async () => {
    const screen = await render(<Controlled />);

    await screen.getByRole("button", { name: "Outside" }).click();

    await expect.element(screen.getByRole("tabpanel")).toHaveTextContent("The notes facet");

    // A controlled value stays put until its owner moves it.
    await screen.getByRole("tab", { name: "links" }).click();
    await expect.element(screen.getByRole("tabpanel")).toHaveTextContent("The notes facet");
  });
});

describe("as a sheet", () => {
  it("is a modal dialog that Escape and the backdrop close", async () => {
    const screen = await render(<Harness form="sheet" defaultOpen />);
    const element = root(screen.container);

    await expect.element(screen.getByRole("dialog", { name: "About this page" })).toBeVisible();
    await expect.element(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(document.documentElement.style.overflow).toBe("hidden");

    press("Escape", screen.getByRole("tab", { name: "about" }).element());
    await expect.poll(() => element.dataset["phase"]).toBe("put-away");
    expect(document.documentElement.style.overflow).toBe("");

    await screen.getByRole("button", { name: "Open the folder" }).click();
    await expect.poll(() => element.dataset["phase"]).toBe("dealt");

    // An unstyled scrim has no box to press, so the press is dispatched.
    screen
      .getByTestId("backdrop")
      .element()
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect.poll(() => element.dataset["phase"]).toBe("put-away");
  });

  it("wraps Tab inside the dialog", async () => {
    const screen = await render(<Harness form="sheet" defaultOpen />);
    const field = screen.getByRole("textbox").element();

    if (!(field instanceof HTMLElement)) throw new Error("expected the field");

    field.focus();
    press("Tab", field);

    // The last tabbable is the field; Tab wraps to the first, the selected tab.
    await expect.element(screen.getByRole("tab", { name: "about" })).toHaveFocus();
  });
});

describe("Deck.Step", () => {
  it("takes the first Escape for itself and leaves the second to the deck", async () => {
    const screen = await render(<WithStep />);

    press("Escape", screen.getByRole("button", { name: "Confirm" }).element());

    await expect.element(screen.getByText("Step closed")).toBeVisible();
    expect(root(screen.container).dataset["phase"]).toBe("dealt");
  });
});

describe("the flights", () => {
  it("plays real animations and lands in each phase", async () => {
    const screen = await render(<Harness reducedMotion="never" />);
    const element = root(screen.container);

    await screen.getByRole("button", { name: "Open the folder" }).click();

    expect(element.dataset["phase"]).toBe("dealing");
    await expect.poll(() => element.dataset["phase"], { timeout: 3000 }).toBe("dealt");

    await screen.getByRole("button", { name: "Put the folder away" }).click();

    expect(element.dataset["phase"]).toBe("putting-away");
    await expect.poll(() => element.dataset["phase"], { timeout: 3000 }).toBe("put-away");
  });
});
