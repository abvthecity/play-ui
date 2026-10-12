"use client";

import { useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from "react";

/**
 * A card that pops out of whatever is being dragged and follows the pointer,
 * in place of the browser's own drag image.
 *
 * The drag stays a native one — it still carries its data, drops into other
 * apps and fires `dragover` on the page's targets — but its picture is swapped
 * for a transparent pixel and the consumer draws the card instead, so it can
 * pop, lean into the direction it is carried and land. The drag is started in
 * one place (a row's `dragstart`) and the card drawn in another (a layer
 * mounted once), so the two meet in a small store rather than in props.
 *
 * ```tsx
 * const linkCard = createDragCard<Link>();
 *
 * <div draggable onDragStart={(event) => linkCard.start(event, link)} />
 *
 * function Layer() {
 *   const { payload, outcome, ref } = linkCard.useCard();
 *   if (payload === null) return null;
 *   return <div ref={ref} className="follow" data-outcome={outcome ?? undefined}>…</div>;
 * }
 * ```
 *
 * The hook writes the followed element's `transform` (a `translate3d` to the
 * pointer) and a `--drag-lean` custom property, in degrees, from how fast the
 * pointer is moving sideways; everything else about the card is the consumer's,
 * including `position: fixed`, `left: 0`, `top: 0` and `pointer-events: none`,
 * which a drop target underneath it needs.
 */

/** How the drag ended: over a target that took it, or anywhere else. */
export type DragCardOutcome = "dropped" | "cancelled";

export interface DragCardSnapshot<T> {
  /** What is in the hand, kept through the exit so the card can still draw it. */
  payload: T | null;
  /** Null while the card is held; how it ended for the `exitMs` after. */
  outcome: DragCardOutcome | null;
}

export interface DragCardOptions {
  /** How long the card stays after the drag ends, for its landing. */
  exitMs?: number;
  /** The most the card leans, in degrees, however fast it is carried. */
  maxLean?: number;
}

export interface DragCardView<T, E extends HTMLElement = HTMLElement> extends DragCardSnapshot<T> {
  /** The element that follows the pointer. */
  ref: RefObject<E | null>;
}

export interface DragCard<T> {
  /** Call from `dragstart`: hides the native picture and puts `payload` in the hand. */
  start: (event: DragStartLike, payload: T) => void;
  /** The card's side: what is held, how it ended, and the ref to follow the pointer with. */
  useCard: <E extends HTMLElement = HTMLElement>() => DragCardView<T, E>;
  /** The current snapshot, outside React. */
  get: () => DragCardSnapshot<T>;
}

/** The part of a `dragstart` event this reads, so a React or a native event both do. */
export interface DragStartLike {
  clientX: number;
  clientY: number;
  dataTransfer: Pick<DataTransfer, "setDragImage"> | null;
  /** The element the drag began on, whose window the drag's events arrive in. */
  target: EventTarget | null;
}

/**
 * The window a drag's events are delivered to: the one its element lives in,
 * which is not this script's own when the element was rendered into a frame.
 */
function windowOf(target: EventTarget | null): Window {
  const node = target as Partial<Node> | null;

  return node?.ownerDocument?.defaultView ?? window;
}

const IDLE: DragCardSnapshot<never> = { payload: null, outcome: null };

/**
 * A pointer event this long after the last drag event means the drag is over
 * even though no `dragend` reached the window: the element it started on left
 * the page mid-drag (a virtualized row scrolled away), and a detached node's
 * `dragend` bubbles nowhere.
 */
const STALE_MS = 250;

/** How much of each new sideways speed reading the lean takes. */
const LEAN_SMOOTHING = 0.35;

/** Degrees of lean per px/ms of sideways speed. */
const LEAN_PER_SPEED = 9;

let blank: HTMLImageElement | null = null;

/**
 * The transparent pixel the native drag shows instead of its snapshot. Made
 * ahead of the first drag where possible: `setDragImage` takes an image only
 * once it has decoded, and a data URI decodes on the next task, not at once.
 */
function blankImage(): HTMLImageElement | null {
  if (blank === null && typeof Image !== "undefined") {
    blank = new Image(1, 1);
    blank.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  }

  return blank;
}

blankImage();

export function createDragCard<T>(options: DragCardOptions = {}): DragCard<T> {
  const exitMs = options.exitMs ?? 240;
  const maxLean = options.maxLean ?? 8;

  let snapshot: DragCardSnapshot<T> = IDLE;
  const listeners = new Set<() => void>();
  const followers = new Set<HTMLElement>();

  let x = 0;
  let y = 0;
  let lean = 0;
  let lastAt = 0;
  let frame = 0;
  let exit = 0;
  let detach: (() => void) | null = null;

  function set(next: DragCardSnapshot<T>): void {
    snapshot = next;

    for (const listener of listeners) listener();
  }

  function write(element: HTMLElement): void {
    element.style.transform = `translate3d(${String(x)}px, ${String(y)}px, 0)`;
    element.style.setProperty("--drag-lean", `${lean.toFixed(2)}deg`);
  }

  function paint(): void {
    frame = 0;

    for (const element of followers) write(element);
  }

  function move(nextX: number, nextY: number): void {
    const now = performance.now();
    const dt = now - lastAt;

    // Some browsers report a last `dragover` at 0,0 as the pointer leaves the
    // window; that is not a place the card should jump to.
    if (nextX === 0 && nextY === 0) return;

    if (dt > 0) {
      const speed = (nextX - x) / dt;
      const target = Math.max(-maxLean, Math.min(maxLean, speed * LEAN_PER_SPEED));

      lean += (target - lean) * LEAN_SMOOTHING;
    }

    x = nextX;
    y = nextY;
    lastAt = now;

    if (frame === 0) frame = requestAnimationFrame(paint);
  }

  function finish(outcome: DragCardOutcome): void {
    detach?.();
    detach = null;

    if (snapshot.payload === null) return;

    lean = 0;
    paint();
    set({ payload: snapshot.payload, outcome });

    const payload = snapshot.payload;

    exit = window.setTimeout(() => {
      if (snapshot.payload === payload) set(IDLE);
    }, exitMs);
  }

  function onDragOver(event: DragEvent): void {
    move(event.clientX, event.clientY);
  }

  // A drop reaches the window only over a target that took the drag, and it
  // ends the drag there and then: the element the drag began on is often what
  // the drop removes, and then its `dragend` never arrives.
  function onDrop(): void {
    finish("dropped");
  }

  function onDragEnd(event: DragEvent): void {
    const effect = event.dataTransfer?.dropEffect ?? "none";

    finish(effect === "none" ? "cancelled" : "dropped");
  }

  function onPointer(): void {
    if (performance.now() - lastAt > STALE_MS) finish("cancelled");
  }

  function listen(view: Window): () => void {
    view.addEventListener("dragover", onDragOver, true);
    view.addEventListener("drop", onDrop, true);
    view.addEventListener("dragend", onDragEnd, true);
    view.addEventListener("pointermove", onPointer, true);
    view.addEventListener("pointerdown", onPointer, true);

    return () => {
      view.removeEventListener("dragover", onDragOver, true);
      view.removeEventListener("drop", onDrop, true);
      view.removeEventListener("dragend", onDragEnd, true);
      view.removeEventListener("pointermove", onPointer, true);
      view.removeEventListener("pointerdown", onPointer, true);
    };
  }

  function start(event: DragStartLike, payload: T): void {
    const image = blankImage();

    if (image !== null && event.dataTransfer !== null) event.dataTransfer.setDragImage(image, 0, 0);

    detach?.();
    window.clearTimeout(exit);

    x = event.clientX;
    y = event.clientY;
    lean = 0;
    lastAt = performance.now();
    detach = listen(windowOf(event.target));
    set({ payload, outcome: null });
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  function get(): DragCardSnapshot<T> {
    return snapshot;
  }

  function getServer(): DragCardSnapshot<T> {
    return IDLE;
  }

  function useCard<E extends HTMLElement = HTMLElement>(): DragCardView<T, E> {
    const current = useSyncExternalStore(subscribe, get, getServer);
    const ref = useRef<E | null>(null);
    const held = current.payload !== null;

    // Before paint, so the card's first frame is already under the pointer
    // rather than at the corner of the page.
    useLayoutEffect(() => {
      const element = ref.current;

      if (!held || element === null) return undefined;

      write(element);
      followers.add(element);

      return () => {
        followers.delete(element);
      };
    }, [held]);

    return { ...current, ref };
  }

  return { start, useCard, get };
}
