"use client";

import { releaseVelocity, springTiming, type PointerSample, type Spring } from "@play-ui/physics";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";

import { dockAt, releasePlace, stepPlace, tuckedSide, untuck, type DockPlace } from "../dock.ts";

export interface UseDockOptions<E extends HTMLElement = HTMLElement> {
  /** Where the element rests now. The hook never moves it there; the consumer's layout does. */
  position: DockPlace;
  /**
   * Called once when a drag lets go, an arrow key steps, or a tucked element is
   * pressed back out, with the place chosen. Never a tucked place unless `tuck`.
   */
  onDock: (position: DockPlace) => void;
  /**
   * Let the element be flung or dragged past a side edge to hide there
   * (`tucked-left`, `tucked-right`), with the consumer's layout leaving a
   * sliver on screen. A press on the tucked element, or a pull inward, brings it
   * back to the dock on that side instead of clicking it.
   */
  tuck?: boolean;
  /** Travel in px before a press becomes a drag; below it, the press is still a click. */
  dragThreshold?: number;
  /** No glide from where it was dropped to where it docks. */
  reducedMotion?: boolean;
  /** The glide into place. */
  spring?: Spring;
  disabled?: boolean;
  /**
   * The element whose width is split into the three docks; the viewport when
   * omitted. A stack docked inside a frame narrower than the window names it.
   */
  area?: RefObject<HTMLElement | null>;
  /** The element's ref, when the consumer already holds one; otherwise the hook makes its own. */
  ref?: RefObject<E | null>;
}

export interface UseDockResult<E extends HTMLElement> {
  /** The element that is dragged: the hook writes its `transform` while it moves. */
  ref: RefObject<E | null>;
  /** True from the moment a press crosses the threshold until it lets go. */
  dragging: boolean;
  /** The place the element would land in if it were let go now, ignoring a throw; `position` at rest. */
  target: DockPlace;
  /** Spread onto the dragged element. */
  handlers: {
    onPointerDown: (event: PointerEvent<E>) => void;
    onPointerMove: (event: PointerEvent<E>) => void;
    onPointerUp: (event: PointerEvent<E>) => void;
    onPointerCancel: (event: PointerEvent<E>) => void;
    onClickCapture: (event: MouseEvent<E>) => void;
    onKeyDown: (event: KeyboardEvent<E>) => void;
  };
}

const GLIDE: Spring = { stiffness: 420, damping: 32, mass: 0.8 };

interface Press {
  id: number;
  x: number;
  y: number;
  moved: boolean;
  /** Recent pointer positions, for the throw at release. */
  samples: PointerSample[];
}

/**
 * The horizontal throw at release, in px/ms, or none when the samples span too
 * little time to say: a handful of events a millisecond apart (a synthetic drag,
 * a coalesced burst) would otherwise read as a fling.
 */
function throwOf(samples: readonly PointerSample[]): number {
  const first = samples[0];
  const last = samples.at(-1);

  if (first === undefined || last === undefined || last.t - first.t < 20) return 0;

  return releaseVelocity(samples).x;
}

/**
 * Drag an element to one of three docks along the foot of the page.
 *
 * Headless in the package's way: the hook moves the element under the pointer
 * and says which dock it is over, and the consumer's layout decides where each
 * dock is. On release the element is measured where it was dropped, the dock
 * changes, and it glides from the drop to its new resting place (a FLIP), so
 * the layout never has to know a drag happened.
 *
 * A press that travels less than `dragThreshold` is left alone, so the element
 * can still be a button; the click that follows a real drag is swallowed. The
 * arrow keys step the dock left and right from the keyboard.
 *
 * With `tuck`, a drag let go a good way past a side edge, or a throw at one,
 * tucks the element behind it (`releasePlace`); the consumer draws it there
 * with a sliver showing, and a press on it brings it back.
 */
export function useDock<E extends HTMLElement>({
  position,
  onDock,
  dragThreshold = 6,
  reducedMotion = false,
  spring = GLIDE,
  disabled = false,
  tuck = false,
  ref: given,
  area,
}: UseDockOptions<E>): UseDockResult<E> {
  const own = useRef<E | null>(null);
  const ref = given ?? own;
  const press = useRef<Press | null>(null);
  const swallowClick = useRef(false);
  // Where the element was on screen when it was let go, to glide from.
  const dropped = useRef<DOMRect | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState<DockPlace>(position);

  useLayoutEffect(() => {
    const element = ref.current;
    const from = dropped.current;

    if (element === null || from === null) return;

    dropped.current = null;

    if (reducedMotion) return;

    const to = element.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    element.animate(
      [{ transform: `translate(${String(dx)}px, ${String(dy)}px)` }, { transform: "none" }],
      springTiming(spring),
    );
  });

  // Focus leaving the window mid-drag (a switch of app or tab) ends it where
  // it began, so nothing is left following a pointer that has gone.
  useEffect(() => {
    if (!dragging) return undefined;

    function onBlur(): void {
      const element = ref.current;

      if (element === null || !press.current?.moved) return;

      land(position);
      settle(element);
    }

    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("blur", onBlur);
    };
  });

  /** Where the element lands if let go at `x` with a throw of `vx`. */
  function placeOf(x: number, vx = 0): DockPlace {
    const box = area?.current?.getBoundingClientRect();
    const origin = box?.left ?? 0;
    const width = box?.width ?? window.innerWidth;

    if (!tuck) return dockAt(x - origin, width);

    const rect = ref.current?.getBoundingClientRect();

    return releasePlace({
      x: x - origin,
      vx,
      left: (rect?.left ?? x) - origin,
      right: (rect?.right ?? x) - origin,
      width,
    });
  }

  function settle(element: E): void {
    element.style.transform = "";
    press.current = null;
    setDragging(false);
  }

  function land(next: DockPlace): void {
    if (ref.current) dropped.current = ref.current.getBoundingClientRect();
    onDock(next);
  }

  function onPointerDown(event: PointerEvent<E>): void {
    swallowClick.current = false;

    if (disabled || !event.isPrimary || event.button !== 0) return;

    press.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      samples: [{ t: event.timeStamp, x: event.clientX, y: event.clientY }],
    };
  }

  function onPointerMove(event: PointerEvent<E>): void {
    const current = press.current;

    if (current === null || current.id !== event.pointerId) return;

    // Released somewhere that sent no pointerup (outside the window) and back
    // with nothing held: land it here instead of leaving it on the cursor.
    if (event.pointerType === "mouse" && event.buttons === 0) {
      onPointerUp(event);

      return;
    }

    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;

    current.samples.push({ t: event.timeStamp, x: event.clientX, y: event.clientY });
    if (current.samples.length > 12) current.samples.shift();

    if (!current.moved) {
      if (Math.hypot(dx, dy) < dragThreshold) return;

      current.moved = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // A pointer that is no longer active (or a synthetic one) cannot be
        // captured; the drag still follows it while it stays over the element.
      }
      setDragging(true);
    }

    event.currentTarget.style.transform = `translate(${String(dx)}px, ${String(dy)}px)`;
    setHover(placeOf(event.clientX));
  }

  function onPointerUp(event: PointerEvent<E>): void {
    const current = press.current;

    if (current === null || current.id !== event.pointerId) return;

    if (!current.moved) {
      press.current = null;

      return;
    }

    swallowClick.current = true;
    current.samples.push({ t: event.timeStamp, x: event.clientX, y: event.clientY });
    land(placeOf(event.clientX, throwOf(current.samples)));
    settle(event.currentTarget);
  }

  function onPointerCancel(event: PointerEvent<E>): void {
    if (press.current?.moved) {
      // Back where it was, gliding from where it was abandoned.
      land(position);
    }

    settle(event.currentTarget);
  }

  function onClickCapture(event: MouseEvent<E>): void {
    if (swallowClick.current) {
      swallowClick.current = false;
      event.preventDefault();
      event.stopPropagation();

      return;
    }

    // A press on a tucked element, from a pointer or Enter, brings it back
    // rather than clicking it: the sliver is a handle, not the thing itself.
    if (!disabled && tuckedSide(position) !== null) {
      event.preventDefault();
      event.stopPropagation();
      land(untuck(position));
    }
  }

  function onKeyDown(event: KeyboardEvent<E>): void {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    event.stopPropagation();

    const next = stepPlace(position, event.key === "ArrowLeft" ? -1 : 1);

    if (next !== position) land(next);
  }

  return {
    ref,
    dragging,
    target: dragging ? hover : position,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClickCapture,
      onKeyDown,
    },
  };
}
