import { describe, expect, it } from "vitest";

import { createBoard } from "./board.ts";
import { keyCaps, rowWidth } from "./cap.ts";
import { qwertyInternational } from "./layouts/qwerty-international.ts";
import { qwertyUK } from "./layouts/qwerty-uk.ts";
import { qwertyUS } from "./layouts/qwerty-us.ts";
import { mac } from "./platforms/mac.ts";
import { pc } from "./platforms/pc.ts";

const LAYOUTS = [qwertyUS, qwertyUK, qwertyInternational];
const PLATFORMS = [mac, pc];
type Board = ReturnType<typeof createBoard>;

const find = (board: Board, id: string) => keyCaps(board.rows).find((cap) => cap.id === id);
const ids = (board: Board) => keyCaps(board.rows).map((cap) => cap.id);
const altRight = (board: Board) => find(board, "AltRight");

const BOARDS = LAYOUTS.flatMap((layout) =>
  PLATFORMS.map((platform) => createBoard(layout, platform)),
);

/** A layout drawn for a platform. */
describe("createBoard", () => {
  it.each(BOARDS)("draws $layout on $platform as six rows of 14.5 units", (board) => {
    expect(board.rows).toHaveLength(6);

    for (const row of board.rows) expect(rowWidth(row)).toBeCloseTo(14.5);
  });

  it.each(BOARDS)("gives every cap on $layout ($platform) its own id", (board) => {
    // The ISO return is the one cap drawn twice, as two halves of one key.
    const drawn = keyCaps(board.rows)
      .filter((cap) => cap.span !== "lower")
      .map((cap) => cap.id);

    expect(new Set(drawn).size).toBe(drawn.length);
  });

  it("prints the platform's words on the layout's named keys", () => {
    expect(find(createBoard(qwertyUS, mac), "Backspace")?.legend).toBe("delete");
    expect(find(createBoard(qwertyUS, pc), "Enter")?.legend).toBe("enter");
    expect(find(createBoard(qwertyUS, mac), "Enter")?.legend).toBe("return");
  });

  it("keeps the legend on the upper half of a two-row return", () => {
    const halves = keyCaps(createBoard(qwertyUK, mac).rows).filter((cap) => cap.id === "Enter");

    expect(halves.map((cap) => [cap.span, cap.legend])).toEqual([
      ["upper", "return"],
      ["lower", ""],
    ]);
  });

  it("turns the right alt into alt gr on a British or international PC only", () => {
    expect(altRight(createBoard(qwertyUK, pc))).toMatchObject({ legend: "alt gr" });
    expect(altRight(createBoard(qwertyUK, pc))?.modifier).toBeUndefined();
    expect(altRight(createBoard(qwertyInternational, pc))?.legend).toBe("alt gr");
    expect(altRight(createBoard(qwertyUS, pc))?.modifier).toBe("alt");
    expect(altRight(createBoard(qwertyUK, mac))?.modifier).toBe("alt");
  });

  it("draws the ISO shape with an extra key before Z", () => {
    expect(ids(createBoard(qwertyUS, pc))).not.toContain("IntlBackslash");
    expect(ids(createBoard(qwertyUK, pc))).toContain("IntlBackslash");
    expect(ids(createBoard(qwertyInternational, mac))).toContain("IntlBackslash");
  });
});
