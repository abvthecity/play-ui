"use client";

import {
  cloneElement,
  createElement,
  isValidElement,
  type ReactElement,
  type RefCallback,
} from "react";

/** A class name, or one worked out from the part's state. */
export type StateClassName<State> = string | ((state: State) => string | undefined);

/**
 * What a part renders as: an element to merge its props into, or a function
 * handed the props and the state to build one from.
 */
export type RenderProp<State> =
  | ReactElement<Record<string, unknown>>
  | ((props: Record<string, unknown>, state: State) => ReactElement);

/** The two props every part takes on top of its element's own. */
export interface PartProps<State> {
  className?: StateClassName<State> | undefined;
  render?: RenderProp<State> | undefined;
}

/** Any element's props. */
export type Props = Record<string, unknown>;

/**
 * Every ref in one callback, with React 19's cleanup semantics: a callback
 * that returns a cleanup gets it run on detach, one that does not is called
 * with null, and an object ref has its `current` cleared.
 */
export function mergeRefs(...refs: unknown[]): RefCallback<unknown> {
  return (value) => {
    const cleanups = refs.map((ref): (() => void) => {
      if (typeof ref === "function") {
        const cleanup: unknown = Reflect.apply(ref, undefined, [value]);

        return typeof cleanup === "function"
          ? () => Reflect.apply(cleanup, undefined, [])
          : () => Reflect.apply(ref, undefined, [null]);
      }

      if (typeof ref === "object" && ref !== null && "current" in ref) {
        Reflect.set(ref, "current", value);

        return () => Reflect.set(ref, "current", null);
      }

      return () => undefined;
    });

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  };
}

/**
 * The part's own props under the consumer's.
 *
 * Handlers chain with the consumer's first, and the part's own is skipped when
 * the consumer called `preventDefault()` — the escape hatch for a key the part
 * would otherwise act on. Styles merge with the consumer's winning; refs merge.
 * An `undefined` own prop is dropped, so an absent `data-*` stays absent.
 */
export function mergeProps(own: Props, consumer: Props): Props {
  const merged: Props = {};

  for (const [key, value] of Object.entries(own)) {
    if (value !== undefined) merged[key] = value;
  }

  for (const [key, value] of Object.entries(consumer)) {
    if (value === undefined) continue;

    const existing = merged[key];

    if (/^on[A-Z]/u.test(key) && typeof existing === "function" && typeof value === "function") {
      merged[key] = (event: unknown, ...rest: unknown[]): void => {
        Reflect.apply(value, undefined, [event, ...rest]);

        const prevented =
          typeof event === "object" &&
          event !== null &&
          "defaultPrevented" in event &&
          event.defaultPrevented === true;

        if (!prevented) Reflect.apply(existing, undefined, [event, ...rest]);
      };
    } else if (key === "style" && typeof existing === "object" && typeof value === "object") {
      merged[key] = { ...existing, ...value };
    } else if (key === "ref" && existing) {
      merged[key] = mergeRefs(existing, value);
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

/** Render a part: its tag, or whatever `render` asks for, with every prop merged. */
export function renderPart<State>(
  tag: string,
  state: State,
  part: PartProps<State>,
  own: Props,
  consumer: Props,
): ReactElement {
  const className = typeof part.className === "function" ? part.className(state) : part.className;
  const props = mergeProps(own, { ...consumer, className });
  const { render } = part;

  if (typeof render === "function") return render(props, state);

  if (isValidElement<Props>(render)) return cloneElement(render, mergeProps(props, render.props));

  return createElement(tag, props);
}
