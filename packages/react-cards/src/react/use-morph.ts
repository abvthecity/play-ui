"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

import {
  captureMorph,
  playMorph,
  type MorphRun,
  type MorphSnapshot,
  type PlayMorphOptions,
} from "../morph.ts";

export interface UseMorphResult {
  /**
   * Notes where everything is, runs `change` (a state update), and plays the
   * morph once that update has committed. `options` is read then, so a
   * function in it sees the new layout.
   */
  morph: (change: () => void, options?: PlayMorphOptions | (() => PlayMorphOptions)) => void;
}

/**
 * `captureMorph` and `playMorph` around a React state change: call
 * `morph(() => setView(next))` and every keyed element under `root` plays from
 * where it was drawn to where the new render draws it. A second morph while
 * one is playing starts from wherever the elements are mid-flight.
 */
export function useMorph(root: RefObject<HTMLElement | null>): UseMorphResult {
  const pending = useRef<{
    snapshot: MorphSnapshot;
    options: PlayMorphOptions | (() => PlayMorphOptions) | undefined;
  } | null>(null);
  const running = useRef<MorphRun | null>(null);

  // After every commit: a morph that was asked for plays against the new layout.
  useLayoutEffect(() => {
    const next = pending.current;
    const element = root.current;

    if (next === null || element === null) return;

    pending.current = null;

    const options = typeof next.options === "function" ? next.options() : next.options;

    running.current = playMorph(element, next.snapshot, options);
  });

  useLayoutEffect(
    () => () => {
      running.current?.cancel();
    },
    [],
  );

  const morph: UseMorphResult["morph"] = (change, options) => {
    const element = root.current;

    if (element !== null) {
      // Captured before the last run is stopped, so it starts from mid-flight.
      const snapshot = captureMorph(element);

      running.current?.cancel();
      running.current = null;
      pending.current = { snapshot, options };
    }

    change();
  };

  return { morph };
}
