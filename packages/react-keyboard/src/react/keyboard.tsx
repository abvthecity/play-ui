import { renderPart, type PartProps } from "@play-ui/utils";
import type { ComponentPropsWithoutRef, ReactElement } from "react";

import type { Board } from "../board.ts";
import type { KeyCap, KeyRow } from "../cap.ts";
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
 * The drawing: rows of caps, headless. It is a picture of the keys a shortcut
 * presses, never a control, so it is hidden from assistive technology: the
 * row it illustrates already says the same thing in words and key caps.
 *
 * The root carries `data-layout` and `data-platform`, and `data-kind`
 * (`chord`, `sequence`, `any`) while something is lit. Each row is a
 * `div[data-part="row"]`; each cap a `div[data-part="cap"]` with `data-key`
 * (its `KeyboardEvent.code`), `data-lit` and, for a sequence, `data-step`
 * (1, 2, …) so the look can number them; `data-half` and `data-blank` for the
 * short and empty caps, `data-modifier` for the ones that hold a modifier and
 * `data-span` (`upper`, `lower`) for the halves of a two-row return.
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
    const shifted = cap.shifted && cap.shifted !== cap.legend ? cap.shifted : null;

    return (
      <div
        key={cap.span ? `${cap.id}-${cap.span}` : cap.id}
        data-part="cap"
        data-key={cap.id}
        data-lit={step === undefined ? undefined : ""}
        data-step={sequence && step !== undefined ? String(step + 1) : undefined}
        data-half={cap.half ? "" : undefined}
        data-blank={cap.blank ? "" : undefined}
        data-modifier={cap.modifier}
        data-span={cap.span}
        style={style}
      >
        {shifted ? <span data-part="shifted">{shifted}</span> : null}
        {cap.legend ? <span data-part="legend">{cap.legend}</span> : null}
        {cap.sub ? <span data-part="sub">{cap.sub}</span> : null}
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
