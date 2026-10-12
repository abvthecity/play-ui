import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { Keyboard, createBoard, mac, pc, qwertyUK, qwertyUS, triggerOf } from "../index.ts";

/** `Keyboard` in a real browser: the board as data attributes, lit by a trigger. */
describe("Keyboard", () => {
  const board = createBoard(qwertyUS, mac);

  it("draws six rows hidden from assistive technology", async () => {
    const screen = await render(<Keyboard board={board} trigger={null} data-testid="board" />);
    const root = screen.getByTestId("board").element();

    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.dataset["layout"]).toBe("qwerty-us");
    expect(root.dataset["platform"]).toBe("mac");
    expect(root.dataset["kind"]).toBeUndefined();
    expect(root.querySelectorAll('[data-part="row"]')).toHaveLength(6);
    expect(root.querySelectorAll("[data-lit]")).toHaveLength(0);
  });

  it("lights a chord's caps", async () => {
    const screen = await render(
      <Keyboard board={board} trigger={triggerOf(board, ["⌘", "K"])} data-testid="board" />,
    );
    const root = screen.getByTestId("board").element();
    const lit = [...root.querySelectorAll<HTMLElement>("[data-lit]")].map(
      (el) => el.dataset["key"],
    );

    expect(root.dataset["kind"]).toBe("chord");
    expect(lit).toEqual(["KeyK", "MetaLeft", "MetaRight"]);
    expect(root.querySelector("[data-step]")).toBeNull();
  });

  it("numbers a sequence's steps", async () => {
    const trigger = triggerOf(board, ["g", "i"], { sequence: true });
    const screen = await render(<Keyboard board={board} trigger={trigger} data-testid="board" />);
    const root = screen.getByTestId("board").element();

    expect(root.querySelector<HTMLElement>('[data-key="KeyG"]')?.dataset["step"]).toBe("1");
    expect(root.querySelector<HTMLElement>('[data-key="KeyI"]')?.dataset["step"]).toBe("2");
  });

  it("lights both halves of a two-row return", async () => {
    const uk = createBoard(qwertyUK, pc);
    const screen = await render(
      <Keyboard board={uk} trigger={triggerOf(uk, ["↵"])} data-testid="board" />,
    );
    const halves = screen.getByTestId("board").element().querySelectorAll('[data-key="Enter"]');

    expect(
      [...halves].map((el) => [el.getAttribute("data-span"), el.hasAttribute("data-lit")]),
    ).toEqual([
      ["upper", true],
      ["lower", true],
    ]);
  });

  it("works out its class from the state", async () => {
    const screen = await render(
      <Keyboard
        board={board}
        trigger={triggerOf(board, ["?"])}
        className={(state) => `board ${state.kind ?? "rest"} ${state.platform}`}
        data-testid="board"
      />,
    );

    expect(screen.getByTestId("board").element().className).toBe("board chord mac");
  });
});
