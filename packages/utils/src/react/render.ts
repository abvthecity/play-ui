"use client";

import { mergeProps as mergeElementProps } from "@base-ui/react/merge-props";
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
 * The consumer's handlers, each telling the merge to skip the part's own when
 * it called `preventDefault()` — the escape hatch for a key the part would
 * otherwise act on.
 */
function preventable(consumer: Props): Props {
  const wrapped: Props = { ...consumer };

  for (const [key, handler] of Object.entries(consumer)) {
    if (!/^on[A-Z]/u.test(key) || typeof handler !== "function") continue;

    wrapped[key] = (event: unknown, ...rest: unknown[]): unknown => {
      const result: unknown = Reflect.apply(handler, undefined, [event, ...rest]);

      if (
        typeof event === "object" &&
        event !== null &&
        "defaultPrevented" in event &&
        event.defaultPrevented === true &&
        "preventBaseUIHandler" in event &&
        typeof event.preventBaseUIHandler === "function"
      ) {
        Reflect.apply(event.preventBaseUIHandler, event, []);
      }

      return result;
    };
  }

  return wrapped;
}

/**
 * The part's own props under the consumer's: handlers chain with the
 * consumer's first, classes join, styles merge with the consumer's winning,
 * and refs merge.
 */
function mergePartProps(own: Props, consumer: Props): Props {
  const merged: Props = mergeElementProps<"div">(own, preventable(consumer));

  if (own["ref"] && consumer["ref"]) merged["ref"] = mergeRefs(own["ref"], consumer["ref"]);

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
  const props = mergePartProps(own, { ...consumer, className });
  const { render } = part;

  if (typeof render === "function") return render(props, state);

  if (isValidElement<Props>(render))
    return cloneElement(render, mergePartProps(props, render.props));

  return createElement(tag, props);
}
