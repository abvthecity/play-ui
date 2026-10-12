import {
  releaseDirection,
  releaseVelocity,
  resist,
  springTiming,
  type PointerSample,
  type Spring,
} from "@play-ui/physics";
import { clamp, prefersReducedMotion, type ReducedMotion } from "@play-ui/utils";

import type { VerticalDragEvent } from "./engine.ts";

/**
 * A row of slides the finger pulls along: the stack's gesture and physics, laid
 * flat. A swipe left brings the next slide in, a swipe right the previous one,
 * the ends resist, and a release springs to the slide it was heading for.
 *
 * Where the card stack moves cards over one another, this moves one track
 * sideways, so slides of any size sit side by side with nothing to line up.
 * It owns the track's `transform` and nothing else.
 */

export interface SlideshowOptions {
  /** Travel that turns the slide, as a fraction of the viewport's width. */
  threshold: number;
  /** Release speed that turns the slide whatever the distance, in px/ms. */
  flingVelocity: number;
  /** Travel before the gesture picks an axis, in px. */
  axisLockDistance: number;
  /** How the ends resist: travel is raised to this power. */
  resistExponent: number;
  /** The settle onto a slide. */
  spring: Spring;
  /** Whether to animate, given the viewer's `prefers-reduced-motion`. */
  reducedMotion: ReducedMotion;
}

export const DEFAULT_SLIDESHOW_OPTIONS: Readonly<SlideshowOptions> = {
  threshold: 0.22,
  flingVelocity: 0.3,
  axisLockDistance: 6,
  resistExponent: 0.72,
  spring: { stiffness: 380, damping: 38, mass: 1 },
  reducedMotion: "system",
};

/** What the engine asks of whoever renders it. Read at the moment it acts. */
export interface SlideshowHost {
  count(): number;
  index(): number;
  options(): SlideshowOptions;
  /** The slide on screen changed, by a swipe or by `go`. */
  change(index: number): void;
  /** A drag that locked to the vertical axis, to pull the slideshow closed. */
  vertical: ((event: VerticalDragEvent) => void) | null;
}

interface Drag {
  readonly id: number;
  readonly x0: number;
  readonly y0: number;
  /** The track's offset when the finger went down. */
  readonly from: number;
  readonly samples: PointerSample[];
  axis: "x" | "y" | null;
  dx: number;
  dy: number;
}

/** Pointer-downs that start on these are the element's, never a drag. */
const NO_DRAG = "input, textarea, select, button, a[href], [contenteditable], [data-no-swipe]";

/** Where slide `index` puts the track: a whole step, the gap included, per slide. */
export function slideOffset(index: number, step: number): number {
  return -index * step;
}

/** Where a release goes: the slide it was heading for, never past either end. */
export function releaseTarget(
  index: number,
  count: number,
  dx: number,
  vx: number,
  width: number,
  options: Pick<SlideshowOptions, "threshold" | "flingVelocity">,
): number {
  const direction = releaseDirection(dx, vx, width, options.threshold, options.flingVelocity);

  return clamp(index - direction, 0, Math.max(0, count - 1));
}

export class SlideshowEngine {
  #host: SlideshowHost | null = null;
  #viewport: HTMLElement | null = null;
  #track: HTMLElement | null = null;
  #drag: Drag | null = null;
  #animation: Animation | null = null;
  #suppressClick = false;
  #target: number | null = null;

  /** The slide the track is on or springing to; null before the first move. */
  get target(): number | null {
    return this.#target;
  }

  setHost(host: SlideshowHost): void {
    this.#host = host;
  }

  attach(viewport: HTMLElement | null, track: HTMLElement | null): void {
    if (this.#viewport) {
      this.#viewport.removeEventListener("pointerdown", this.#onDown);
      this.#viewport.removeEventListener("pointermove", this.#onMove);
      this.#viewport.removeEventListener("pointerup", this.#onUp);
      this.#viewport.removeEventListener("pointercancel", this.#onCancel);
      this.#viewport.removeEventListener("click", this.#onClick, true);
    }

    this.#viewport = viewport;
    this.#track = track;

    if (viewport) {
      viewport.addEventListener("pointerdown", this.#onDown);
      viewport.addEventListener("pointermove", this.#onMove);
      viewport.addEventListener("pointerup", this.#onUp);
      viewport.addEventListener("pointercancel", this.#onCancel);
      viewport.addEventListener("click", this.#onClick, true);
    }
  }

  /** The track to where the current slide rests, with nothing in flight. */
  layout(): void {
    if (this.#drag?.axis === "x") return;

    this.#stop();
    this.#place(slideOffset(this.#host?.index() ?? 0, this.#step()));
  }

  /** Slide to `index`, springing from wherever the track is now. */
  go(index: number): void {
    const host = this.#host;

    if (!host) return;

    const target = clamp(index, 0, Math.max(0, host.count() - 1));

    this.#target = target;
    this.#settle(target);

    if (target !== host.index()) host.change(target);
  }

  destroy(): void {
    this.#stop();
    this.attach(null, null);
  }

  // ---------------------------------------------------------------------------

  readonly #onDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest(NO_DRAG)) return;

    this.#suppressClick = false;

    const from = this.#current();

    this.#stop();
    this.#place(from);
    this.#drag = {
      id: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      from,
      samples: [{ t: event.timeStamp, x: event.clientX, y: event.clientY }],
      axis: null,
      dx: 0,
      dy: 0,
    };
  };

  readonly #onMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    const host = this.#host;

    if (!drag || !host || event.pointerId !== drag.id) return;

    drag.dx = event.clientX - drag.x0;
    drag.dy = event.clientY - drag.y0;
    drag.samples.push({ t: event.timeStamp, x: event.clientX, y: event.clientY });

    if (drag.samples.length > 8) drag.samples.shift();

    if (!drag.axis) {
      const options = host.options();

      if (Math.hypot(drag.dx, drag.dy) < options.axisLockDistance) return;

      drag.axis = Math.abs(drag.dx) >= Math.abs(drag.dy) ? "x" : "y";

      if (drag.axis === "y" && !host.vertical) {
        this.#drag = null;

        return;
      }

      this.#viewport?.setPointerCapture(event.pointerId);
      this.#suppressClick = true;

      if (drag.axis === "y") host.vertical?.({ phase: "start", dy: drag.dy, vy: 0 });
    }

    if (drag.axis === "y") {
      host.vertical?.({ phase: "move", dy: drag.dy, vy: releaseVelocity(drag.samples).y });

      return;
    }

    this.#place(drag.from + this.#pull(drag.dx));
  };

  readonly #onUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    const host = this.#host;

    if (!drag || !host || event.pointerId !== drag.id) return;

    this.#drag = null;

    if (drag.axis === "y") {
      host.vertical?.({ phase: "end", dy: drag.dy, vy: releaseVelocity(drag.samples).y });

      return;
    }

    if (drag.axis !== "x") return;

    const width = this.#viewport?.clientWidth ?? 0;
    const { x: vx } = releaseVelocity(drag.samples);

    this.go(releaseTarget(host.index(), host.count(), drag.dx, vx, width, host.options()));
  };

  readonly #onCancel = (event: PointerEvent): void => {
    const drag = this.#drag;

    if (!drag || event.pointerId !== drag.id) return;

    this.#drag = null;

    if (drag.axis === "y") this.#host?.vertical?.({ phase: "cancel", dy: drag.dy, vy: 0 });
    else this.#settle(this.#host?.index() ?? 0);
  };

  /** A drag is not a click on whatever it started on. */
  readonly #onClick = (event: MouseEvent): void => {
    if (!this.#suppressClick) return;

    this.#suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  /** How far the finger's travel moves the track: all of it, less past an end. */
  #pull(dx: number): number {
    const host = this.#host;

    if (!host) return dx;

    const index = host.index();
    const atStart = index === 0 && dx > 0;
    const atEnd = index >= host.count() - 1 && dx < 0;

    return atStart || atEnd ? resist(dx, host.options().resistExponent) : dx;
  }

  #settle(index: number): void {
    const track = this.#track;
    const host = this.#host;

    if (!track || !host) return;

    const from = this.#current();
    const to = slideOffset(index, this.#step());

    this.#stop();
    this.#place(to);

    if (this.#reduced() || Math.abs(to - from) < 0.5) return;

    const timing = springTiming(host.options().spring);

    this.#animation = track.animate(
      [{ transform: translate(from) }, { transform: translate(to) }],
      { duration: timing.duration, easing: timing.easing },
    );
  }

  /** Where the track is drawn right now, mid-animation included. */
  #current(): number {
    const track = this.#track;

    if (!track) return 0;

    const matrix = new DOMMatrixReadOnly(getComputedStyle(track).transform);

    return matrix.m41;
  }

  #stop(): void {
    this.#animation?.cancel();
    this.#animation = null;
  }

  #place(x: number): void {
    if (this.#track) this.#track.style.transform = translate(x);
  }

  /** One slide's width and the gap after it, as the track lays them out. */
  #step(): number {
    const track = this.#track;
    const width = this.#viewport?.clientWidth ?? 0;

    if (!track) return width;

    const gap = Number.parseFloat(getComputedStyle(track).columnGap);

    return width + (Number.isFinite(gap) ? gap : 0);
  }

  #reduced(): boolean {
    return prefersReducedMotion(this.#host?.options().reducedMotion);
  }
}

function translate(x: number): string {
  return `translate3d(${x.toFixed(2)}px, 0, 0)`;
}
