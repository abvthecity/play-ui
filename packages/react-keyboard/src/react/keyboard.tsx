"use client";

import { renderPart, type PartProps } from "@play-ui/utils";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";

import type { Board } from "../board.ts";
import type { KeyCap, KeyRow } from "../cap.ts";
import { tallCapPath, type TallCapGeometry } from "../shape.ts";
import { litCaps, type Trigger, type TriggerKind } from "../trigger.ts";

export interface KeyboardState {
  /** How the lit caps go down, or `null` for a board at rest. */
  readonly kind: TriggerKind | null;
  /** The board's layout id. */
  readonly layout: string;
  /** The board's platform id. */
  readonly platform: string;
}

export interface KeyboardProps
  extends
    Omit<ComponentPropsWithoutRef<"div">, "className" | "children">,
    PartProps<KeyboardState> {
  /** The board to draw: `createBoard(qwertyUS, mac)`. */
  board: Board;
  /** What to light, or `null` for a board at rest. */
  trigger: Trigger | null;
}

/**
 * `value` on a whole device pixel, as a box's own edges are painted, so an
 * outline drawn from measured boxes is as crisp as the boxes beside it.
 */
function pixel(value: number): number {
  return Math.round(value * devicePixelRatio) / devicePixelRatio;
}

/** A row's key: its first cap, which no other row starts with. */
function rowKey(row: KeyRow): string {
  const first = row[0];

  if (!first) return "";

  return "stack" in first ? first.stack[0].id : first.id;
}

/**
 * The outline of a cap that spans two rows, measured from the cap (its top)
 * and its foot in the row below, drawn as one SVG behind the legend. Until it
 * has measured (on the server, and the first frame) nothing is drawn and the
 * cap carries no `data-shaped`, so a look can style it as a plain cap.
 *
 * Three paths share the L, so a look can lay the same layers on it as on a
 * box: `shape-face` (the fill), `shape-edge` (a stroke clipped to the inside
 * of the L, as an inset outline is) and `shape-depth` (the band along every
 * bottom edge, as tall as `--cap-depth` (none when it is unset), as an inset
 * shadow from below is). The band follows the variable live, with no
 * measuring.
 */
function TallShape(props: { id: string; onShaped: (shaped: boolean) => void }): ReactElement {
  const { id, onShaped } = props;
  const svg = useRef<SVGSVGElement>(null);
  const [geometry, setGeometry] = useState<(TallCapGeometry & { x: number; y: number }) | null>(
    null,
  );
  // An id fit for `url(#…)`.
  const unique = `cap${useId().replaceAll(/[^\w-]/gu, "")}`;

  useLayoutEffect(() => {
    const cap = svg.current?.parentElement;
    const board = cap?.parentElement?.parentElement;
    const foot = board?.querySelector<HTMLElement>(
      `[data-part="foot"][data-key="${CSS.escape(id)}"]`,
    );

    if (!cap || !foot) return undefined;

    function measure(): void {
      if (!cap || !foot) return;

      const top = cap.getBoundingClientRect();
      const bottom = foot.getBoundingClientRect();
      const style = getComputedStyle(cap);
      const left = pixel(top.left);
      const upper = pixel(top.top);

      setGeometry({
        x: left - top.left,
        y: upper - top.top,
        width: pixel(top.right) - left,
        height: pixel(bottom.bottom) - upper,
        foot: pixel(top.right) - pixel(bottom.left),
        step: pixel(top.bottom) - upper,
        radius: Number.parseFloat(style.borderTopLeftRadius) || 0,
      });
      onShaped(true);
    }

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(cap);
    observer.observe(foot);

    return () => {
      observer.disconnect();
      onShaped(false);
    };
  }, [id, onShaped]);

  const path = geometry ? tallCapPath(geometry) : "";
  const clip = `${unique}-inside`;
  const band = `${unique}-band`;

  return (
    <svg
      ref={svg}
      data-part="shape"
      aria-hidden="true"
      fill="none"
      width={geometry?.width ?? 0}
      height={geometry?.height ?? 0}
      style={{
        position: "absolute",
        top: geometry?.y ?? 0,
        left: geometry?.x ?? 0,
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      {geometry ? (
        <>
          <defs>
            <clipPath id={clip}>
              <path d={path} />
            </clipPath>
            <mask id={band}>
              <path d={path} fill="white" />
              <path
                d={path}
                fill="black"
                style={{ transform: "translateY(calc(var(--cap-depth, 0px) * -1))" }}
              />
            </mask>
          </defs>
          <path data-part="shape-face" d={path} />
          <path data-part="shape-edge" d={path} clipPath={`url(#${clip})`} />
          <path data-part="shape-depth" d={path} mask={`url(#${band})`} />
        </>
      ) : null}
    </svg>
  );
}

/** A cap spanning two rows: its own state for whether its outline is drawn. */
function TallCap(props: {
  cap: KeyCap;
  attributes: Record<string, unknown>;
  children: ReactNode;
}): ReactElement {
  const [shaped, setShaped] = useState(false);

  return (
    <div {...props.attributes} data-shaped={shaped ? "" : undefined}>
      <TallShape id={props.cap.id} onShaped={setShaped} />
      {props.children}
    </div>
  );
}

/**
 * The drawing: rows of caps, headless. It is a picture of the keys a shortcut
 * presses, never a control, so it is hidden from assistive technology: the
 * row it illustrates already says the same thing in words and key caps.
 *
 * The root carries `data-layout` and `data-platform`, and `data-kind`
 * (`chord`, `sequence`, `any`) while something is lit. Each row is a
 * `div[data-part="row"]`; each cap a `div[data-part="cap"]` with `data-key`
 * (its `KeyboardEvent.code`), `data-lit` and, for a sequence, `data-step`
 * (1, 2, …) so the look can number them; `data-half` and `data-blank` for the
 * short and empty caps, and `data-modifier` for the ones that hold a modifier.
 *
 * A cap that spans two rows (the ISO return) is one `data-part="cap"` in the
 * upper row with `data-span="upper"`, and a `div[data-part="foot"]` holding
 * its room in the row below. The cap draws its L-shaped outline as an
 * `svg[data-part="shape"]` with `shape-face`, `shape-edge` and `shape-depth`
 * paths, and carries `data-shaped` once that outline is drawn.
 * `--cap-width` is the cap's width in key units, and `--cap-index` its place
 * on the board, for a stagger.
 */
export function Keyboard(props: KeyboardProps): ReactElement {
  const { board, trigger, className, render, ...rest } = props;
  const lit = litCaps(trigger);
  const sequence = trigger?.kind === "sequence";
  const state: KeyboardState = {
    kind: trigger ? trigger.kind : null,
    layout: board.layout,
    platform: board.platform,
  };
  let index = 0;

  function renderCap(cap: KeyCap): ReactElement {
    const step = lit.get(cap.id);
    const style = {
      "--cap-width": String(cap.width),
      "--cap-index": String(index++),
    } as Record<string, string>;

    // The lower half of a two-row cap is only room in its row; the upper half
    // is the cap, and draws the whole outline over both.
    if (cap.span === "lower") {
      return <div key={`${cap.id}-foot`} data-part="foot" data-key={cap.id} style={style} />;
    }

    const shifted = cap.shifted && cap.shifted !== cap.legend ? cap.shifted : null;
    const attributes = {
      "data-part": "cap",
      "data-key": cap.id,
      "data-lit": step === undefined ? undefined : "",
      "data-step": sequence && step !== undefined ? String(step + 1) : undefined,
      "data-half": cap.half ? "" : undefined,
      "data-blank": cap.blank ? "" : undefined,
      "data-modifier": cap.modifier,
      "data-span": cap.span,
      style,
    };
    const legends = (
      <>
        {shifted ? <span data-part="shifted">{shifted}</span> : null}
        {cap.legend ? <span data-part="legend">{cap.legend}</span> : null}
        {cap.sub ? <span data-part="sub">{cap.sub}</span> : null}
      </>
    );

    if (cap.span === "upper") {
      return (
        <TallCap key={cap.id} cap={cap} attributes={attributes}>
          {legends}
        </TallCap>
      );
    }

    return (
      <div key={cap.id} {...attributes}>
        {legends}
      </div>
    );
  }

  const children = board.rows.map((row) => (
    <div key={rowKey(row)} data-part="row">
      {row.map((item) =>
        "stack" in item ? (
          <div
            key={item.stack[0].id}
            data-part="stack"
            style={{ "--cap-width": String(item.stack[0].width) } as Record<string, string>}
          >
            {item.stack.map(renderCap)}
          </div>
        ) : (
          renderCap(item)
        ),
      )}
    </div>
  ));

  return renderPart(
    "div",
    state,
    { className, render },
    {
      "aria-hidden": true,
      "data-layout": board.layout,
      "data-platform": board.platform,
      "data-kind": state.kind ?? undefined,
      children,
    },
    rest,
  );
}
