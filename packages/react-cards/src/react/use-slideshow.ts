"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { VerticalDragEvent } from "../engine.ts";
import { DEFAULT_SLIDESHOW_OPTIONS, SlideshowEngine, type SlideshowOptions } from "../slideshow.ts";

export interface UseSlideshowOptions {
  count: number;
  /** The slide on screen. Controlled: `onIndexChange` asks for the next one. */
  index: number;
  onIndexChange: (index: number) => void;
  /** A drag that locked to the vertical axis. Without it, one is dropped. */
  onVerticalDrag?: ((event: VerticalDragEvent) => void) | undefined;
  options?: Partial<SlideshowOptions> | undefined;
}

export interface UseSlideshowResult {
  /** The clipping box a drag starts on. Give it `overflow: hidden`. */
  viewportRef: (element: HTMLElement | null) => void;
  /**
   * The row of slides. Give it `display: flex` and each slide `flex: 0 0 100%`;
   * a `column-gap` on it is counted into every step.
   */
  trackRef: (element: HTMLElement | null) => void;
  /** Slide to `index`, clamped to the ends. */
  go: (index: number) => void;
}

/**
 * A slideshow the finger pulls along (`SlideshowEngine`): swipe left for the
 * next slide, right for the previous one, and the ends resist. Headless — the
 * hook moves the track and the consumer draws everything, including the
 * viewport's `touch-action: none` when it hands in `onVerticalDrag`, or
 * `pan-y` when it leaves the page to scroll.
 */
export function useSlideshow(props: UseSlideshowOptions): UseSlideshowResult {
  const { count, index, onIndexChange, onVerticalDrag, options: optionsProp } = props;
  const [engine] = useState(() => new SlideshowEngine());
  const viewport = useRef<HTMLElement | null>(null);
  const track = useRef<HTMLElement | null>(null);
  const options = useMemo<SlideshowOptions>(
    () => ({ ...DEFAULT_SLIDESHOW_OPTIONS, ...optionsProp }),
    [optionsProp],
  );

  // What the engine reads when it acts, handed over once each render commits.
  useLayoutEffect(() => {
    engine.setHost({
      count: () => count,
      index: () => index,
      options: () => options,
      change: onIndexChange,
      vertical: onVerticalDrag ?? null,
    });
  });

  // A change of slide from outside a drag (a button, a key) springs there;
  // the first render and a resize just put the track in place.
  const shown = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (shown.current === null) engine.layout();
    // A swipe has already set off for this slide; only an outside change moves.
    else if (shown.current !== index && engine.target !== index) engine.go(index);

    shown.current = index;
  }, [engine, index]);

  useLayoutEffect(() => {
    const element = viewport.current;

    if (!element || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => {
      engine.layout();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [engine]);

  useLayoutEffect(() => () => engine.destroy(), [engine]);

  const viewportRef = useCallback(
    (element: HTMLElement | null) => {
      viewport.current = element;
      engine.attach(element, track.current);
    },
    [engine],
  );
  const trackRef = useCallback(
    (element: HTMLElement | null) => {
      track.current = element;
      engine.attach(viewport.current, element);
    },
    [engine],
  );

  const go = useCallback(
    (next: number) => {
      engine.go(next);
    },
    [engine],
  );

  return { viewportRef, trackRef, go };
}
