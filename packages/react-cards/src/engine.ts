import {
  DEFAULT_CARD_STACK_OPTIONS,
  type CardStackOptions,
  type SwipeDirection,
  type SwipeEffect,
} from "./options.ts";
import {
  clamp,
  cyclePath,
  dragProgress,
  halfSpan,
  lerp,
  liftedPose,
  poseTransform,
  releaseDirection,
  releaseVelocity,
  resist,
  restPose,
  springTiming,
  tiltFactor,
  type CyclePath,
  type DepthGeometry,
  type PointerSample,
  type Pose,
} from "./physics.ts";

/** A vertical drag on the stage, handed to whoever owns the surface around it. */
export interface VerticalDragEvent {
  readonly phase: "start" | "move" | "end" | "cancel";
  /** Travel since the pointer went down, in px. */
  readonly dy: number;
  /** Velocity at this moment, in px/ms. */
  readonly vy: number;
}

/**
 * What the engine asks of whoever renders the stack. Every method reads the
 * latest state: the engine outlives any one render.
 */
export interface CardStackHost {
  count(): number;
  topKey(): string | null;
  options(): CardStackOptions;
  effect(direction: SwipeDirection): SwipeEffect;
  /** Make the order change. The host re-renders and then calls `layout()`. */
  commit(effect: "cycle" | "dismiss", direction: SwipeDirection, key: string): void;
  /** Bring the bottom card to the top. The host re-renders and then calls `layout()`. */
  commitBack(): void;
  press(key: string): void;
  armedChange(direction: SwipeDirection | null): void;
}

interface Drag {
  readonly id: number;
  readonly x0: number;
  readonly y0: number;
  readonly tilt: number;
  readonly samples: PointerSample[];
  axis: "x" | "y" | null;
  dx: number;
  dy: number;
  pose: Pose | null;
  lift: number;
  armed: SwipeDirection | null;
}

interface Indicator {
  readonly depth: number;
  readonly direction: SwipeDirection;
  readonly element: HTMLElement;
}

interface Pending {
  readonly effect: "cycle" | "dismiss";
  readonly direction: SwipeDirection;
  readonly key: string;
}

interface Timing {
  readonly duration: number;
  readonly easing?: string;
  readonly delay?: number;
}

/** Pointer-downs that start on these are the element's, never a drag. */
const NO_DRAG =
  "input, textarea, select, [contenteditable=''], [contenteditable='true'], [data-no-swipe]";

/** Until the first render commits: an empty stack that does nothing. */
const IDLE_HOST: CardStackHost = {
  count: () => 0,
  topKey: () => null,
  options: () => ({ ...DEFAULT_CARD_STACK_OPTIONS }),
  effect: () => "none",
  commit: () => undefined,
  commitBack: () => undefined,
  press: () => undefined,
  armedChange: () => undefined,
};

const sign = (direction: SwipeDirection): 1 | -1 => (direction === "right" ? 1 : -1);

/**
 * The stack's motion, with no framework in it.
 *
 * It owns the DOM elements' transforms and nothing else. Only two cards are
 * real — depth 0 and depth 1 — and the rest are placeholder planes; a swipe
 * plays out on those elements and then asks the host to change the order, at
 * which point the content moves between the elements and `layout()` puts the
 * elements back where they rest, in the same frame, so nothing visibly jumps.
 */
export class CardStackEngine {
  #host: CardStackHost = IDLE_HOST;
  #signature: string | null = null;
  #stageWaiting = false;
  #vertical: ((event: VerticalDragEvent) => void) | null = null;
  #stage: HTMLElement | null = null;
  readonly #slots = new Map<number, HTMLElement>();
  readonly #shades = new Map<number, HTMLElement>();
  readonly #indicators = new Set<Indicator>();
  readonly #animations = new Set<Animation>();
  readonly #timers = new Set<ReturnType<typeof setTimeout>>();
  #token = 0;
  #swiping = false;
  /** Set while a card brought back from the bottom is still on its way to the top. */
  #returning = false;
  #pending: Pending | null = null;
  /** Set while `request` runs: the swipe came from the owner's code, not an event. */
  #requested = false;
  #drag: Drag | null = null;
  #reveal = false;
  #suppressClick = false;

  /**
   * The latest view of the stack; call it after every render commits. A new
   * `signature` — the order and the geometry, however the host spells them —
   * puts every card back where it rests. A swipe still in flight when the
   * stack changed under it is dropped rather than landed on the wrong card.
   */
  sync(host: CardStackHost, signature: string): void {
    const first = this.#signature === null;

    this.#host = host;

    if (signature === this.#signature) return;

    this.#signature = signature;

    if (first) {
      if (this.#stageWaiting) this.mountStage();

      return;
    }

    if (this.#swiping) {
      this.#token += 1;
      this.#swiping = false;
      this.#pending = null;
    }

    this.layout();
  }

  /** The stage has mounted: lay out and play `appear`, once the first sync has come. */
  mountStage(): void {
    if (this.#signature === null) {
      this.#stageWaiting = true;

      return;
    }

    this.#stageWaiting = false;
    this.layout();
    this.appear();
  }

  /** Whether a swipe is playing out. */
  get swiping(): boolean {
    return this.#swiping;
  }

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  setStage(element: HTMLElement | null): void {
    if (this.#stage === element) return;

    if (this.#stage) {
      this.#stage.removeEventListener("pointerdown", this.#onDown);
      this.#stage.removeEventListener("pointermove", this.#onMove);
      this.#stage.removeEventListener("pointerup", this.#onUp);
      this.#stage.removeEventListener("pointercancel", this.#onCancel);
      this.#stage.removeEventListener("lostpointercapture", this.#onLost);
      this.#stage.removeEventListener("click", this.#onClick, true);
    }

    this.#stage = element;

    if (element) {
      element.addEventListener("pointerdown", this.#onDown);
      element.addEventListener("pointermove", this.#onMove);
      element.addEventListener("pointerup", this.#onUp);
      element.addEventListener("pointercancel", this.#onCancel);
      element.addEventListener("lostpointercapture", this.#onLost);
      element.addEventListener("click", this.#onClick, true);
    }
  }

  /** Who hears a drag that locks to the vertical axis; without one it is dropped. */
  setVerticalDrag(handler: ((event: VerticalDragEvent) => void) | null): void {
    this.#vertical = handler;
  }

  setSlot(depth: number, element: HTMLElement | null): void {
    if (element) this.#slots.set(depth, element);
    else this.#slots.delete(depth);
  }

  setShade(depth: number, element: HTMLElement | null): void {
    if (element) this.#shades.set(depth, element);
    else this.#shades.delete(depth);
  }

  addIndicator(depth: number, direction: SwipeDirection, element: HTMLElement): () => void {
    const indicator = { depth, direction, element };

    this.#indicators.add(indicator);
    this.#paintIndicator(indicator, null, 0);

    return () => {
      this.#indicators.delete(indicator);
    };
  }

  destroy(): void {
    this.#token += 1;
    this.#cancelAll();
    this.#watchWindow(false);
    this.setStage(null);
  }

  // ---------------------------------------------------------------------------
  // Public motion
  // ---------------------------------------------------------------------------

  /** Every card to where it rests, every animation dropped. */
  layout(): void {
    this.#cancelAll();
    this.#returning = false;

    const geometry = this.#geometry();

    for (const [depth, element] of this.#slots) {
      this.#place(element, this.#shades.get(depth), restPose(depth, geometry));
      element.style.zIndex = String(100 - depth);
      element.style.opacity = "";
    }

    this.#gesture(null, 0, 0);

    if (this.#reveal) {
      this.#reveal = false;
      // A dismiss with more cards behind the cap than shown: one more comes into view.
      const deepest = this.#slots.get(this.#deepest());

      if (deepest && !this.#reduced()) {
        void this.#track(
          deepest.animate(
            [{ opacity: 0 }, { opacity: 1 }],
            this.#timing({ duration: 220, easing: "ease-out" }),
          ),
        );
      }
    }
  }

  /** The cards beneath fan down out of the top one. */
  appear(): void {
    const options = this.#host.options();

    if (!options.appear || this.#reduced()) return;

    const geometry = this.#geometry();
    const spring = springTiming(this.#promoteSpring(options));

    for (const depth of this.#underDepths()) {
      void this.#move(
        this.#slots.get(depth),
        this.#shades.get(depth),
        restPose(0, geometry),
        restPose(depth, geometry),
        {
          ...spring,
          delay: options.appearDelay + depth * options.appearStagger,
        },
      );
    }
  }

  /** Anything in flight lands where it was going, now. */
  settle(): void {
    if (this.#swiping && this.#pending) {
      this.#token += 1;
      this.#finish();
    } else {
      this.layout();
    }
  }

  /**
   * A swipe asked for by the owner's code through `actionsRef`, which may run
   * outside any event: the same as `swipe`, except that a reduced-motion
   * landing waits a microtask instead of flushing React on the spot.
   */
  request(direction: SwipeDirection): boolean {
    this.#requested = true;

    try {
      return this.swipe(direction);
    } finally {
      this.#requested = false;
    }
  }

  /**
   * Swipe the top card one way, as a button or a key does, or as a release
   * does with the pose, speed, tilt and rise it let go at.
   */
  swipe(direction: SwipeDirection, from?: Pose, velocity = 0, tilt?: number, lift = 0): boolean {
    if (this.#swiping || this.#returning) this.settle();

    const options = this.#host.options();
    const effect = this.#host.effect(direction);
    const count = this.#host.count();
    const key = this.#host.topKey();
    const top = this.#slots.get(0);
    const s = sign(direction);

    if (!top || !key || count === 0) return false;

    if (effect === "none" || (effect === "cycle" && count < 2)) {
      this.#nudge(s, from);

      return false;
    }

    const token = (this.#token += 1);
    const geometry = this.#geometry();
    const start = from ?? restPose(0, geometry);
    const lean = tilt ?? (options.tilt === "none" ? 0 : 1);
    const thrown = velocity * s > 0.05;

    this.#swiping = true;
    this.#pending = { effect, direction, key };

    if (!from) this.#gesture(direction, 1, 0);

    if (this.#reduced()) {
      if (this.#requested) {
        // A microtask later: the commit flushes React synchronously, which
        // React refuses from inside an effect, and `request` may be called
        // from one. A second swipe first settles this one, and the token
        // keeps it from landing twice.
        queueMicrotask(() => {
          if (token === this.#token) this.#finish();
        });
      } else {
        this.#finish();
      }

      return true;
    }

    const { exit, clearAt } =
      effect === "dismiss"
        ? this.#dismissExit(top, s, start, from !== undefined, lean, velocity, thrown)
        : this.#cycleExit(top, s, start, lean, velocity, thrown, token);

    // The last card, dismissed: nothing comes forward.
    if (count === 1) {
      void exit.then((ok) => {
        if (ok && token === this.#token) this.#finish();
      });

      return true;
    }

    const promote = springTiming(this.#promoteSpring(options));
    const jobs = [exit];

    // The cards beneath carry on from wherever the drag left them.
    for (const depth of this.#underDepths()) {
      jobs.push(
        this.#move(
          this.#slots.get(depth),
          this.#shades.get(depth),
          liftedPose(depth, lift, geometry),
          restPose(depth - 1, geometry),
          {
            ...promote,
            delay:
              Math.max(0, clearAt + options.promoteDelay) + (depth - 1) * options.promoteStagger,
          },
        ),
      );
    }

    void Promise.all(jobs).then(() => {
      if (token === this.#token) this.#finish();
    });

    return true;
  }

  /**
   * The bottom card back on top: a cycle played the other way. The order
   * changes first, so the card arriving is a real one with its content; it
   * slides out from beneath the stack on the side a cycle leaves by, turns
   * just clear of it, and springs home in front while the rest step back a
   * depth. False with fewer than two cards, where nothing is beneath.
   */
  back(): boolean {
    if (this.#swiping || this.#returning) this.settle();

    if (this.#host.count() < 2 || !this.#slots.get(0)) return false;

    if (this.#requested) {
      // The commit flushes React, which React refuses from inside an effect,
      // and `requestBack` may be called from one: a microtask later, as
      // `request` lands a reduced-motion swipe.
      const token = (this.#token += 1);

      queueMicrotask(() => {
        if (token === this.#token) this.#back();
      });
    } else {
      this.#back();
    }

    return true;
  }

  /** `back`, asked for by the owner's code through `actionsRef`; see `request`. */
  requestBack(): boolean {
    this.#requested = true;

    try {
      return this.back();
    } finally {
      this.#requested = false;
    }
  }

  #back(): void {
    if (this.#host.count() < 2) return;

    const options = this.#host.options();
    // Where the bottom card rests, taken before the order moves under it.
    const deepest = this.#deepest();
    const home = restPose(deepest, this.#geometry());

    this.#host.commitBack();

    const top = this.#slots.get(0);

    if (!top || this.#reduced()) return;

    const geometry = this.#geometry();
    const token = (this.#token += 1);
    const s = sign(this.#backSide());
    const lean = options.tilt === "none" ? 0 : 1;
    const rotation = s * lean * options.maxRotation * options.cycleRotation;
    const width = top.offsetWidth;
    const clear = width / 2 + halfSpan(width, top.offsetHeight, rotation) + options.cycleGap;
    const path = cyclePath(0, 0, clear, options.cycleOutDuration, {
      stiffness: options.cycleStiffness,
      damping: options.cycleDamping,
      mass: 1,
    });
    const promote = springTiming(this.#promoteSpring(options));

    this.#returning = true;

    // The rest step back a depth while it is still behind them, the deepest
    // first: the promote after a cycle, run the other way.
    const jobs = this.#underDepths().map((depth) =>
      this.#move(
        this.#slots.get(depth),
        this.#shades.get(depth),
        restPose(depth - 1, geometry),
        restPose(depth, geometry),
        { ...promote, delay: (deepest - depth) * options.promoteStagger },
      ),
    );

    jobs.push(this.#arrive(top, s, home, rotation, path, token));

    void Promise.all(jobs).then(() => {
      if (token === this.#token) this.#returning = false;
    });
  }

  /** The side a card brought back comes from: the side a cycle leaves by. */
  #backSide(): SwipeDirection {
    if (this.#host.effect("left") === "cycle") return "left";
    if (this.#host.effect("right") === "cycle") return "right";

    return "left";
  }

  /**
   * `#cycle` in a mirror: out from beneath the stack, growing to the front as
   * it clears it, a turn with no stop, and home in front.
   */
  #arrive(
    top: HTMLElement,
    s: 1 | -1,
    home: Pose,
    rotation: number,
    path: CyclePath,
    token: number,
  ): Promise<boolean> {
    const shade = this.#shades.get(0);
    const last = path.points.length - 1;
    const frames: Keyframe[] = [];
    const shades: Keyframe[] = [];

    this.#place(top, shade, restPose(0, this.#geometry()));
    // Until the turn it is behind the stack it is coming out of.
    top.style.zIndex = "0";

    for (let t = 0; ; t = Math.min(last, t + 8)) {
      const x = path.points[t] ?? 0;
      const out = t <= path.apexAt ? clamp(path.apex > 0 ? x / path.apex : 1, 0, 1) : 1;
      const lean = t <= path.apexAt ? 1 : clamp(path.apex > 0 ? x / path.apex : 0, 0, 1);
      const pose: Pose = {
        x: s * x + (1 - out) * home.x,
        y: lerp(home.y, 0, out),
        r: t <= path.apexAt ? lerp(home.r, rotation, out) : rotation * lean,
        s: lerp(home.s, 1, out),
        shade: lerp(home.shade, 0, out),
      };
      const offset = last === 0 ? 1 : t / last;

      frames.push({ transform: poseTransform(pose), offset });
      shades.push({ opacity: pose.shade, offset });

      if (t === last) break;
    }

    // At the turn it is clear of the stack, so it comes up in front unseen.
    const timer = setTimeout(() => {
      this.#timers.delete(timer);

      if (token !== this.#token) return;

      top.style.zIndex = "100";
    }, path.apexAt * this.#host.options().timeScale);

    this.#timers.add(timer);

    const timing = this.#timing({ duration: last });
    const jobs = [this.#track(top.animate(frames, timing))];

    if (shade) jobs.push(this.#track(shade.animate(shades, timing)));

    return Promise.all(jobs).then((results) => results.every(Boolean));
  }

  /** A dismissed card leaves the viewport, the way it was going. */
  #dismissExit(
    top: HTMLElement,
    s: 1 | -1,
    start: Pose,
    dragged: boolean,
    lean: number,
    velocity: number,
    thrown: boolean,
  ): { exit: Promise<boolean>; clearAt: number } {
    const options = this.#host.options();
    const rotation =
      s *
      Math.max(Math.abs(start.r), Math.abs(lean) * options.maxRotation) *
      options.dismissRotation;
    const rect = top.getBoundingClientRect();
    const centre = rect.left + rect.width / 2 - start.x;
    const viewport = document.documentElement.clientWidth || window.innerWidth;
    const reach = halfSpan(top.offsetWidth, top.offsetHeight, rotation) + options.dismissOvershoot;
    const out: Pose = {
      x: s > 0 ? viewport - centre + reach : -(centre + reach),
      y: start.y + (dragged ? 0 : -options.dismissLift),
      r: rotation,
      s: 1,
      shade: 0,
    };
    const distance = Math.abs(out.x - start.x);
    const fly: Timing = thrown
      ? {
          duration: clamp((distance / Math.abs(velocity)) * 1.6, 140, options.dismissDuration),
          easing: "cubic-bezier(0.25, 0.75, 0.5, 1)",
        }
      : { duration: options.dismissDuration, easing: "cubic-bezier(0.5, 0, 0.75, 0.4)" };

    return { exit: this.#move(top, this.#shades.get(0), start, out, fly), clearAt: fly.duration };
  }

  /** A cycled card swings just clear of the stack and home beneath it. */
  #cycleExit(
    top: HTMLElement,
    s: 1 | -1,
    start: Pose,
    lean: number,
    velocity: number,
    thrown: boolean,
    token: number,
  ): { exit: Promise<boolean>; clearAt: number } {
    const options = this.#host.options();
    const width = top.offsetWidth;
    const rotation =
      Math.abs(start.r) > 0.01 ? start.r : s * lean * options.maxRotation * options.cycleRotation;
    const clear = width / 2 + halfSpan(width, top.offsetHeight, rotation) + options.cycleGap;
    const path = cyclePath(
      Math.max(0, s * start.x),
      thrown ? Math.abs(velocity) : 0,
      clear,
      options.cycleOutDuration,
      {
        stiffness: options.cycleStiffness,
        damping: options.cycleDamping,
        mass: 1,
      },
    );
    // The next card may start forward once this one stops covering it.
    const clearAt = Math.max(
      0,
      path.points.findIndex((point) => point >= clear - options.cycleGap),
    );

    return { exit: this.#cycle(top, s, start, rotation, path, token), clearAt };
  }

  // ---------------------------------------------------------------------------
  // The gesture
  // ---------------------------------------------------------------------------

  readonly #onDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest(NO_DRAG)) return;
    if (this.#host.count() === 0) return;

    this.#suppressClick = false;
    this.settle();

    const top = this.#slots.get(0);

    if (!top) return;

    const options = this.#host.options();
    const rect = top.getBoundingClientRect();
    const tilt =
      options.tilt === "none"
        ? 0
        : options.tilt === "fixed"
          ? 1
          : tiltFactor(event.clientY - rect.top, rect.height);

    this.#watchWindow(true);
    this.#drag = {
      id: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      tilt,
      samples: [{ t: event.timeStamp, x: event.clientX, y: event.clientY }],
      axis: null,
      dx: 0,
      dy: 0,
      pose: null,
      lift: 0,
      armed: null,
    };
  };

  readonly #onMove = (event: PointerEvent): void => {
    const drag = this.#drag;

    if (!drag || event.pointerId !== drag.id) return;

    const options = this.#host.options();

    drag.dx = event.clientX - drag.x0;
    drag.dy = event.clientY - drag.y0;
    drag.samples.push({ t: event.timeStamp, x: event.clientX, y: event.clientY });

    if (drag.samples.length > 8) drag.samples.shift();

    // The button came up somewhere nothing told us — outside the window, over
    // a frame — and the pointer has come back with nothing held: that is the
    // release, where it is now, rather than a card stuck to the cursor.
    if (event.pointerType === "mouse" && event.buttons === 0) {
      this.#onUp(event);

      return;
    }

    if (!drag.axis && !this.#lockAxis(drag, event.pointerId, options.axisLockDistance)) return;

    if (drag.axis === "y") {
      this.#vertical?.({ phase: "move", dy: drag.dy, vy: releaseVelocity(drag.samples).y });

      return;
    }

    const top = this.#slots.get(0);

    if (!top) return;

    const direction: SwipeDirection = drag.dx > 0 ? "right" : "left";
    const open = this.#opens(direction);
    const width = top.offsetWidth;
    const x = open ? drag.dx : resist(drag.dx, options.resistExponent);
    const progress = open ? dragProgress(x, width, options.threshold) : 0;

    drag.pose = {
      x,
      y: drag.dy * options.dragFollowY,
      r: (x / width) * options.maxRotation * drag.tilt,
      s: 1,
      shade: 0,
    };
    top.style.transform = poseTransform(drag.pose);

    drag.lift =
      options.lift && open ? clamp(Math.abs(x) / (width * options.liftDistance), 0, 1) : 0;
    this.#follow(drag.lift);
    this.#gesture(direction, progress, x);

    const armed = progress >= 1 ? direction : null;

    if (armed !== drag.armed) {
      drag.armed = armed;
      this.#host.armedChange(armed);
    }
  };

  /**
   * Past the lock distance a press becomes a drag along one axis. Captured
   * only then, so a press that never moves is an ordinary click on whatever
   * it landed on: a link inside a card opens, and a modified click opens it
   * wherever the browser puts those. False while it is still a press, or when
   * a vertical drag has nobody to hear it and is dropped.
   */
  #lockAxis(drag: Drag, pointerId: number, distance: number): boolean {
    if (Math.hypot(drag.dx, drag.dy) < distance) return false;

    drag.axis = Math.abs(drag.dx) >= Math.abs(drag.dy) ? "x" : "y";

    try {
      this.#stage?.setPointerCapture(pointerId);
    } catch {
      // A synthetic pointer has nothing to capture; the drag still works.
    }

    if (drag.axis === "y") {
      if (!this.#vertical) {
        this.#drag = null;
        this.#watchWindow(false);

        return false;
      }

      this.#vertical({ phase: "start", dy: drag.dy, vy: 0 });
    }

    return true;
  }

  readonly #onUp = (event: PointerEvent): void => {
    const drag = this.#drag;

    if (!drag || event.pointerId !== drag.id) return;

    this.#drag = null;
    this.#watchWindow(false);
    this.#release(drag, false);
  };

  readonly #onCancel = (event: PointerEvent): void => {
    const drag = this.#drag;

    if (!drag || event.pointerId !== drag.id) return;

    this.#drag = null;
    this.#watchWindow(false);
    this.#release(drag, true);
  };

  /**
   * The stage's own capture taken away ends the drag; a capture lost anywhere
   * inside it does not. A finger is captured by the element it lands on — the
   * card, or the link in it — the moment it touches, so when `#lockAxis` moves
   * the capture to the stage, that element loses it and the event bubbles up
   * here. Heard as a cancel, it put every touch swipe back before it began,
   * which is why a phone could not swipe at all while a mouse, which has no
   * implicit capture, could.
   */
  readonly #onLost = (event: PointerEvent): void => {
    if (event.target !== this.#stage) return;

    this.#onCancel(event);
  };

  /** The window lost focus mid-drag (a switch of app or tab): the card goes home. */
  readonly #onBlur = (): void => {
    const drag = this.#drag;

    if (!drag) return;

    this.#drag = null;
    this.#watchWindow(false);
    this.#release(drag, true);
  };

  /**
   * While a press is held, the window hears its end too: a release off the
   * stage before the drag was captured, or off the page altogether, still
   * lets go of the card instead of leaving it held.
   */
  #watchWindow(on: boolean): void {
    if (typeof window === "undefined") return;

    if (on) {
      window.addEventListener("pointerup", this.#onUp);
      window.addEventListener("pointercancel", this.#onCancel);
      window.addEventListener("blur", this.#onBlur);
    } else {
      window.removeEventListener("pointerup", this.#onUp);
      window.removeEventListener("pointercancel", this.#onCancel);
      window.removeEventListener("blur", this.#onBlur);
    }
  }

  readonly #onClick = (event: MouseEvent): void => {
    if (!this.#suppressClick) return;

    this.#suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  #release(drag: Drag, cancelled: boolean): void {
    const options = this.#host.options();
    const velocity = releaseVelocity(drag.samples);

    if (drag.armed) this.#host.armedChange(null);

    if (!drag.axis) {
      if (!cancelled) this.#press();

      return;
    }

    this.#suppressClick = true;

    if (drag.axis === "y") {
      this.#vertical?.({ phase: cancelled ? "cancel" : "end", dy: drag.dy, vy: velocity.y });

      return;
    }

    const top = this.#slots.get(0);
    const width = top?.offsetWidth ?? 0;
    const turn = cancelled
      ? 0
      : releaseDirection(drag.dx, velocity.x, width, options.threshold, options.flingVelocity);
    const direction: SwipeDirection = turn > 0 ? "right" : "left";

    if (turn !== 0 && this.#opens(direction)) {
      this.swipe(direction, drag.pose ?? undefined, velocity.x, drag.tilt, drag.lift);

      return;
    }

    this.#snapBack(drag.pose, drag.lift);
  }

  // ---------------------------------------------------------------------------
  // Motion pieces
  // ---------------------------------------------------------------------------

  /** A cycled card, in one piece: out, a turn with no stop, and home beneath. */
  #cycle(
    top: HTMLElement,
    s: 1 | -1,
    start: Pose,
    rotation: number,
    path: CyclePath,
    token: number,
  ): Promise<boolean> {
    const geometry = this.#geometry();
    const home = restPose(this.#deepest(), geometry);
    const shade = this.#shades.get(0);
    const last = path.points.length - 1;
    const frames: Keyframe[] = [];
    const shades: Keyframe[] = [];

    this.#place(top, shade, home);

    for (let t = 0; ; t = Math.min(last, t + 8)) {
      const x = path.points[t] ?? 0;
      const back = t <= path.apexAt ? 0 : clamp(1 - x / path.apex, 0, 1);
      const r =
        t <= path.apexAt
          ? lerp(start.r, rotation, path.apexAt ? t / path.apexAt : 1)
          : lerp(rotation, 0, back);
      const pose: Pose = {
        x: s * x,
        y: lerp(start.y, home.y, back),
        r,
        s: lerp(1, home.s, back),
        shade: lerp(0, home.shade, back),
      };
      const offset = last === 0 ? 1 : t / last;

      frames.push({ transform: poseTransform(pose), offset });
      shades.push({ opacity: pose.shade, offset });

      if (t === last) break;
    }

    // Past the turn it is clear of the stack, so it drops behind it unseen.
    const timer = setTimeout(() => {
      this.#timers.delete(timer);

      if (token !== this.#token) return;

      top.style.zIndex = "0";
      this.#gesture(null, 0, 0);
    }, path.apexAt * this.#host.options().timeScale);

    this.#timers.add(timer);

    const timing = this.#timing({ duration: last });
    const jobs = [this.#track(top.animate(frames, timing))];

    if (shade) jobs.push(this.#track(shade.animate(shades, timing)));

    return Promise.all(jobs).then((results) => results.every(Boolean));
  }

  #snapBack(pose: Pose | null, lift: number): void {
    const options = this.#host.options();
    const geometry = this.#geometry();
    const snap = springTiming({
      stiffness: options.snapStiffness,
      damping: options.snapDamping,
      mass: options.snapMass,
    });

    this.#gesture(null, 0, 0);

    for (const depth of this.#underDepths()) {
      void this.#move(
        this.#slots.get(depth),
        this.#shades.get(depth),
        liftedPose(depth, lift, geometry),
        restPose(depth, geometry),
        snap,
      );
    }

    void this.#move(
      this.#slots.get(0),
      this.#shades.get(0),
      pose ?? restPose(0, geometry),
      restPose(0, geometry),
      snap,
    );
  }

  /** A swipe with nowhere to go: a small push that springs straight back. */
  #nudge(s: 1 | -1, from?: Pose): void {
    const options = this.#host.options();
    const geometry = this.#geometry();
    const spring = springTiming({
      stiffness: options.snapStiffness,
      damping: options.snapDamping * 0.6,
      mass: options.snapMass,
    });

    this.#gesture(null, 0, 0);
    void this.#move(
      this.#slots.get(0),
      this.#shades.get(0),
      from ?? { x: s * 14, y: 0, r: s * 2, s: 1, shade: 0 },
      restPose(0, geometry),
      spring,
    );
  }

  #press(): void {
    const key = this.#host.topKey();
    const top = this.#slots.get(0);
    const options = this.#host.options();

    if (top && options.pressScale !== 1 && !this.#reduced()) {
      const base = poseTransform(restPose(0, this.#geometry()));

      void this.#track(
        top.animate(
          [
            { transform: base },
            { transform: `${base} scale(${options.pressScale})` },
            { transform: base },
          ],
          this.#timing({ duration: 220, easing: "ease-out" }),
        ),
      );
    }

    if (key) this.#host.press(key);
  }

  #finish(): void {
    const pending = this.#pending;

    this.#swiping = false;
    this.#pending = null;

    if (!pending) return;

    const { maxDepth } = this.#host.options();

    this.#reveal = pending.effect === "dismiss" && this.#host.count() - 1 > maxDepth;
    this.#host.commit(pending.effect, pending.direction, pending.key);
  }

  #follow(t: number): void {
    const geometry = this.#geometry();

    for (const depth of this.#underDepths()) {
      const element = this.#slots.get(depth);

      if (element) this.#place(element, this.#shades.get(depth), liftedPose(depth, t, geometry));
    }
  }

  /** Set the end state inline, then play from→to over it. */
  #move(
    element: HTMLElement | undefined,
    shade: HTMLElement | undefined,
    from: Pose,
    to: Pose,
    timing: Timing,
  ): Promise<boolean> {
    if (!element) return Promise.resolve(true);

    this.#place(element, shade, to);

    if (this.#reduced()) return Promise.resolve(true);

    const resolved = this.#timing(timing);
    const jobs = [
      this.#track(
        element.animate(
          [{ transform: poseTransform(from) }, { transform: poseTransform(to) }],
          resolved,
        ),
      ),
    ];

    if (shade && from.shade !== to.shade) {
      jobs.push(
        this.#track(shade.animate([{ opacity: from.shade }, { opacity: to.shade }], resolved)),
      );
    }

    return Promise.all(jobs).then((results) => results.every(Boolean));
  }

  #place(element: HTMLElement, shade: HTMLElement | undefined, pose: Pose): void {
    element.style.transform = poseTransform(pose);

    if (shade) shade.style.opacity = String(pose.shade);
  }

  /** The stage's and the indicators' view of the drag. */
  #gesture(direction: SwipeDirection | null, progress: number, offset: number): void {
    const stage = this.#stage;

    if (stage) {
      if (direction) stage.dataset.swiping = direction;
      else delete stage.dataset.swiping;

      if (direction && progress >= 1) stage.dataset.armed = "";
      else delete stage.dataset.armed;

      stage.style.setProperty("--card-stack-progress", String(clamp(progress, 0, 1)));
      stage.style.setProperty("--card-stack-offset", `${offset.toFixed(2)}px`);
    }

    for (const indicator of this.#indicators) this.#paintIndicator(indicator, direction, progress);
  }

  #paintIndicator(indicator: Indicator, direction: SwipeDirection | null, progress: number): void {
    const { element } = indicator;
    const active = indicator.depth === 0 && direction === indicator.direction;

    if (active) element.dataset.active = "";
    else delete element.dataset.active;

    if (active && progress >= 1) element.dataset.armed = "";
    else delete element.dataset.armed;

    element.style.setProperty("--card-stack-progress", String(active ? clamp(progress, 0, 1) : 0));
  }

  #track(animation: Animation): Promise<boolean> {
    this.#animations.add(animation);

    return animation.finished.then(
      () => {
        this.#animations.delete(animation);

        return true;
      },
      () => {
        this.#animations.delete(animation);

        return false;
      },
    );
  }

  #cancelAll(): void {
    for (const animation of this.#animations) animation.cancel();

    this.#animations.clear();

    for (const timer of this.#timers) clearTimeout(timer);

    this.#timers.clear();
  }

  #timing(timing: Timing): KeyframeAnimationOptions {
    const { timeScale } = this.#host.options();

    return {
      duration: Math.max(0, timing.duration * timeScale),
      easing: timing.easing ?? "linear",
      delay: (timing.delay ?? 0) * timeScale,
      fill: "backwards",
    };
  }

  #geometry(): DepthGeometry {
    const options = this.#host.options();

    return {
      depthScale: options.depthScale,
      depthOffset: options.depthOffset,
      depthShade: options.depthShade,
      depthRotation: options.depthRotation,
      depthSpread: options.depthSpread,
      cardHeight: this.#slots.get(0)?.offsetHeight ?? 0,
    };
  }

  #promoteSpring(options: CardStackOptions): { stiffness: number; damping: number; mass: number } {
    return { stiffness: options.promoteStiffness, damping: options.promoteDamping, mass: 1 };
  }

  #deepest(): number {
    return Math.max(0, Math.min(this.#host.count() - 1, this.#host.options().maxDepth));
  }

  /** The depths beneath the top card that are drawn, shallowest first. */
  #underDepths(): number[] {
    const deepest = this.#deepest();

    return [...this.#slots.keys()]
      .filter((depth) => depth >= 1 && depth <= deepest)
      .toSorted((a, b) => a - b);
  }

  #opens(direction: SwipeDirection): boolean {
    const effect = this.#host.effect(direction);

    return effect === "dismiss" || (effect === "cycle" && this.#host.count() > 1);
  }

  #reduced(): boolean {
    const { reducedMotion } = this.#host.options();

    if (reducedMotion === "always") return true;
    if (reducedMotion === "never") return false;

    return (
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
}
