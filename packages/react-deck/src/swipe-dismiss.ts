/**
 * Swipe down to close a sheet that rises from the foot of the screen. Plain
 * DOM, so any sheet can share the one gesture; `Deck.Surface` attaches it when
 * the deck is a `"sheet"`.
 *
 * - **A press stays a press.** Nothing moves until the finger has travelled
 *   `SWIPE_SLOP` pixels, and only a mostly-downward travel becomes a drag;
 *   sideways or upward travel is left to the page. After a real drag the click
 *   the lift would make is swallowed, so a drag never lands on a button.
 * - **Content scrolls first.** A drag that starts inside a scroller that is not
 *   at its top scrolls it instead; a field or anything marked
 *   `data-swipe-ignore` never starts one.
 * - **Far or fast closes.** A lift past `SWIPE_CLOSE_FRACTION` of the sheet's
 *   height, or quicker than `SWIPE_CLOSE_VELOCITY`, calls `onDismiss`; any
 *   other lift springs the sheet back.
 *
 * The drag writes the CSS `translate` property, which composes with the
 * `transform` the sheet's own open and close animation uses, so the close slides
 * on from wherever the finger let go. The inline `transition` the drag and the
 * spring need is taken off again once they have run.
 *
 * Touch events, not pointer events: a pointer drag inside a scroller is taken
 * by the browser's pan with a `pointercancel`, and only a non-passive
 * `touchmove` can say no to that.
 */

/** How far a finger travels before a press becomes a drag. */
export const SWIPE_SLOP = 8;

/** How much of the sheet's height a drag has to cover to close it. */
export const SWIPE_CLOSE_FRACTION = 0.25;

/** A flick this fast, in pixels per millisecond, closes it however short. */
export const SWIPE_CLOSE_VELOCITY = 0.5;

/** The shortest gap between two moves that a speed is measured over. */
const MIN_SAMPLE_MS = 8;

const SPRING_BACK_MS = 320;

const SPRING_BACK = `translate ${SPRING_BACK_MS}ms cubic-bezier(0.2, 0.9, 0.3, 1)`;

/** The click a lift after a drag would make, which lands on nothing. */
function swallow(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

/** Whether a touch on `target` may start a drag of `sheet`. */
function mayStart(target: EventTarget | null, sheet: HTMLElement): boolean {
  if (!(target instanceof Element)) return true;
  if (target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) {
    return false;
  }
  if (target.closest("[data-swipe-ignore]")) return false;

  for (let node: Element | null = target; node && node !== sheet; node = node.parentElement) {
    if (node.scrollTop > 0) return false;
  }

  return true;
}

/**
 * Let a swipe down close `sheet`, calling `onDismiss`. Returns the function
 * that takes the gesture off again.
 */
export function swipeToDismiss(sheet: HTMLElement, onDismiss: () => void): () => void {
  let startX = 0;
  let startY = 0;
  let lastY = 0;
  let sampleY = 0;
  let lastAt = 0;
  let velocity = 0;
  let state: "idle" | "pending" | "dragging" = "idle";
  let unswallow: (() => void) | null = null;
  let settleTimer = 0;

  const reset = (): void => {
    state = "idle";
    window.clearTimeout(settleTimer);
    sheet.style.removeProperty("translate");
    sheet.style.removeProperty("transition");
  };

  // The inline styles go once the spring or the close has run, so the sheet's
  // own `transition` is back in force for its next close. Never under a drag
  // that has started since.
  const settle = (after: number): void => {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      if (state === "dragging") return;
      sheet.style.removeProperty("translate");
      sheet.style.removeProperty("transition");
    }, after);
  };

  const swallowNextClick = (): void => {
    const timer = window.setTimeout(() => unswallow?.(), 400);

    sheet.addEventListener("click", swallow, { capture: true, once: true });
    unswallow = () => {
      window.clearTimeout(timer);
      sheet.removeEventListener("click", swallow, { capture: true });
      unswallow = null;
    };
  };

  const onStart = (event: TouchEvent): void => {
    const touch = event.touches[0];

    if (event.touches.length !== 1 || !touch || !mayStart(event.target, sheet)) {
      state = "idle";
      return;
    }

    state = "pending";
    startX = touch.clientX;
    startY = touch.clientY;
    lastY = startY;
    sampleY = startY;
    lastAt = event.timeStamp;
    velocity = 0;
  };

  const onMove = (event: TouchEvent): void => {
    const touch = event.touches[0];

    if (state === "idle" || !touch) return;

    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (state === "pending") {
      if (Math.abs(dx) < SWIPE_SLOP && Math.abs(dy) < SWIPE_SLOP) return;
      if (dy <= 0 || Math.abs(dx) > dy) {
        state = "idle";
        return;
      }
      state = "dragging";
      window.clearTimeout(settleTimer);
      sheet.style.transition = "none";
    }

    if (event.cancelable) event.preventDefault();

    const elapsed = event.timeStamp - lastAt;

    lastY = touch.clientY;

    // Only over a real frame's gap: two moves a hair apart would read as a flick.
    if (elapsed >= MIN_SAMPLE_MS) {
      velocity = (touch.clientY - sampleY) / elapsed;
      sampleY = touch.clientY;
      lastAt = event.timeStamp;
    }
    sheet.style.translate = `0 ${Math.max(0, dy)}px`;
  };

  const onEnd = (): void => {
    if (state !== "dragging") {
      state = "idle";
      return;
    }

    const dy = lastY - startY;
    const far = dy > sheet.getBoundingClientRect().height * SWIPE_CLOSE_FRACTION;

    state = "idle";

    if (far || velocity > SWIPE_CLOSE_VELOCITY) {
      // Left where the finger let go, with the sheet's own transition back,
      // so its close carries on from here. Before the swallow, since a
      // dismiss may itself be a click.
      sheet.style.removeProperty("transition");
      onDismiss();
      swallowNextClick();
      settle(600);
      return;
    }

    swallowNextClick();

    sheet.style.transition = SPRING_BACK;
    sheet.style.translate = "0 0";
    settle(SPRING_BACK_MS + 40);
  };

  sheet.addEventListener("touchstart", onStart, { passive: true });
  sheet.addEventListener("touchmove", onMove, { passive: false });
  sheet.addEventListener("touchend", onEnd);
  sheet.addEventListener("touchcancel", onEnd);

  return () => {
    sheet.removeEventListener("touchstart", onStart);
    sheet.removeEventListener("touchmove", onMove);
    sheet.removeEventListener("touchend", onEnd);
    sheet.removeEventListener("touchcancel", onEnd);
    unswallow?.();
    reset();
  };
}
