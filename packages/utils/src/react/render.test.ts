import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { mergeRefs, renderPart } from "./render.ts";

/** The props `renderPart` hands a render function, given the part's and the consumer's. */
function merged(own: Record<string, unknown>, consumer: Record<string, unknown>) {
  let props: Record<string, unknown> = {};

  renderPart(
    "div",
    null,
    {
      render: (next) => {
        props = next;

        return createElement("div");
      },
    },
    own,
    consumer,
  );

  return props;
}

describe("merging props", () => {
  it("lays the consumer's props over the part's own", () => {
    expect(merged({ id: "own", role: "group" }, { id: "consumer" })).toEqual({
      id: "consumer",
      role: "group",
    });
  });

  it("merges styles with the consumer's winning", () => {
    expect(
      merged({ style: { color: "red", left: 0 } }, { style: { color: "blue" } })["style"],
    ).toEqual({ color: "blue", left: 0 });
  });

  it("chains handlers, consumer first, and skips the part's on preventDefault", () => {
    const calls: string[] = [];
    const { onClick } = merged(
      { onClick: () => calls.push("own") },
      {
        onClick: (event: { defaultPrevented: boolean }) => {
          calls.push(event.defaultPrevented ? "consumer, prevented" : "consumer");
        },
      },
    );

    if (typeof onClick !== "function") throw new Error("expected a handler");

    Reflect.apply(onClick, undefined, [{ nativeEvent: {}, defaultPrevented: false }]);
    Reflect.apply(onClick, undefined, [{ nativeEvent: {}, defaultPrevented: true }]);

    expect(calls).toEqual(["consumer", "own", "consumer, prevented"]);
  });

  it("merges refs", () => {
    const own: { current: unknown } = { current: null };
    const consumer: { current: unknown } = { current: null };
    const { ref } = merged({ ref: own }, { ref: consumer });

    if (typeof ref !== "function") throw new Error("expected a merged ref");

    ref("node");

    expect(own.current).toBe("node");
    expect(consumer.current).toBe("node");
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
