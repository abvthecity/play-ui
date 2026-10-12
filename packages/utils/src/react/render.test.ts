import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { mergeProps, mergeRefs, renderPart } from "./render.ts";

describe("mergeProps", () => {
  it("lays the consumer's props over the part's own, dropping undefined", () => {
    expect(
      mergeProps({ id: "own", "data-x": undefined }, { id: "consumer", title: undefined }),
    ).toEqual({ id: "consumer" });
  });

  it("merges styles with the consumer's winning", () => {
    expect(
      mergeProps({ style: { color: "red", left: 0 } }, { style: { color: "blue" } }).style,
    ).toEqual({ color: "blue", left: 0 });
  });

  it("chains handlers, consumer first, and skips the part's on preventDefault", () => {
    const calls: string[] = [];
    const { onClick } = mergeProps(
      { onClick: () => calls.push("own") },
      {
        onClick: (event: { defaultPrevented: boolean }) => {
          calls.push(event.defaultPrevented ? "consumer, prevented" : "consumer");
        },
      },
    );

    if (typeof onClick !== "function") throw new Error("expected a handler");

    Reflect.apply(onClick, undefined, [{ defaultPrevented: false }]);
    Reflect.apply(onClick, undefined, [{ defaultPrevented: true }]);

    expect(calls).toEqual(["consumer", "own", "consumer, prevented"]);
  });
});

describe("mergeRefs", () => {
  it("sets every ref and clears each on detach", () => {
    const object: { current: unknown } = { current: null };
    const seen: unknown[] = [];
    const cleanup = vi.fn();
    const detach = mergeRefs(
      object,
      (value: unknown) => {
        seen.push(value);
      },
      () => cleanup,
    )("node");

    expect(object.current).toBe("node");
    expect(seen).toEqual(["node"]);

    if (typeof detach === "function") detach();

    expect(object.current).toBeNull();
    expect(seen).toEqual(["node", null]);
    expect(cleanup).toHaveBeenCalledOnce();
  });
});

describe("renderPart", () => {
  it("renders the tag with a class worked out from state", () => {
    const element = renderPart(
      "div",
      { open: true },
      { className: (state) => (state.open ? "open" : undefined) },
      { role: "group" },
      { id: "a" },
    );

    expect(element.type).toBe("div");
    expect(element.props).toEqual({ role: "group", id: "a", className: "open" });
  });

  it("hands a render function the merged props and the state", () => {
    const render = vi.fn((props: Record<string, unknown>) => createElement("span", props));

    renderPart("div", 3, { render }, { role: "group" }, {});

    expect(render).toHaveBeenCalledWith({ role: "group" }, 3);
  });
});
