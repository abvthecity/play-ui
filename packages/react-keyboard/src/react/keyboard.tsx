"use client";

import { renderPart, type PartProps } from "@play-ui/utils";
import {
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
 */
function TallShape(props: { id: string; onShaped: (shaped: boolean) => void }): ReactElement {
  const { id, onShaped } = props;
  const svg = useRef<SVGSVGElement>(null);
  const [geometry, setGeometry] = useState<TallCapGeometry | null>(null);

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
      const radius = Number.parseFloat(getComputedStyle(cap).borderTopLeftRadius) || 0;

      setGeometry({
        width: top.width,
        height: bottom.bottom - top.top,
        foot: bottom.width,
        step: top.height,
        radius,
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

  return (
    <svg
      ref={svg}
      data-part="shape"
      aria-hidden="true"
      fill="none"
      width={geometry?.width ?? 0}
      height={geometry?.height ?? 0}
      style={{ position: "absolute", top: 0, left: 0, overflow: "visible", pointerEvents: "none" }}
    >
      {geometry ? (
        <>
          <path data-part="shape-base" d={tallCapPath(geometry, 0.5)} />
          <path data-part="shape-face" d={tallCapPath(geometry, 0.5, 2)} />
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
 * `svg[data-part="shape"]` with two paths, `shape-base` (the whole L) and
 * `shape-face` (the L 2px shorter along its bottom edges, for depth), and
 * carries `data-shaped` once that outline is drawn; fill and stroke them.
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
