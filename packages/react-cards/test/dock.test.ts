import {
  dockAt,
  isDockPlace,
  isDockPosition,
  releasePlace,
  stepDock,
  stepPlace,
  tuckedSide,
  untuck,
} from "@play-ui/react-cards";
import { describe, expect, it } from "vitest";

/** Where a dragged stack lands along the foot of the page: a third of the viewport each. */
describe("dockAt", () => {
  it("answers the third of the viewport the pointer is in", () => {
    expect(dockAt(0, 1200)).toBe("left");
    expect(dockAt(399, 1200)).toBe("left");
    expect(dockAt(400, 1200)).toBe("center");
    expect(dockAt(799, 1200)).toBe("center");
    expect(dockAt(800, 1200)).toBe("right");
    expect(dockAt(1400, 1200)).toBe("right");
  });

  it("falls back to the centre when there is no viewport to divide", () => {
    expect(dockAt(10, 0)).toBe("center");
  });
});

describe("stepDock", () => {
  it("steps one dock at a time and stops at either end", () => {
    expect(stepDock("center", -1)).toBe("left");
    expect(stepDock("center", 1)).toBe("right");
    expect(stepDock("left", -1)).toBe("left");
    expect(stepDock("right", 1)).toBe("right");
  });
});

describe("isDockPosition", () => {
  it("accepts the three docks and nothing else, so a stale stored value falls back", () => {
    expect(["left", "center", "right"].every(isDockPosition)).toBe(true);
    expect(isDockPosition("top")).toBe(false);
    expect(isDockPosition(null)).toBe(false);
  });
});

/** Tucking: flung or dragged past a side edge, the stack hides there with a sliver left. */
describe("releasePlace", () => {
  const width = 400;

  it("docks under the pointer when the stack is on screen and was not thrown", () => {
    expect(releasePlace({ x: 60, vx: 0, left: 10, right: 206, width })).toBe("left");
    expect(releasePlace({ x: 200, vx: 0.4, left: 102, right: 298, width })).toBe("center");
    expect(releasePlace({ x: 350, vx: 0, left: 190, right: 386, width })).toBe("right");
  });

  it("tucks when a good third of the stack is past a side edge", () => {
    expect(releasePlace({ x: 20, vx: 0, left: -70, right: 126, width })).toBe("tucked-left");
    expect(releasePlace({ x: 20, vx: 0, left: -60, right: 136, width })).toBe("left");
    expect(releasePlace({ x: 390, vx: 0, left: 274, right: 470, width })).toBe("tucked-right");
  });

  it("tucks on a throw at an edge from that side's third, and only there", () => {
    expect(releasePlace({ x: 100, vx: -1.4, left: 2, right: 198, width })).toBe("tucked-left");
    expect(releasePlace({ x: 300, vx: 1.4, left: 202, right: 398, width })).toBe("tucked-right");
    // Thrown the other way, or from the middle, it only docks.
    expect(releasePlace({ x: 100, vx: 1.4, left: 2, right: 198, width })).toBe("left");
    expect(releasePlace({ x: 200, vx: -2, left: 102, right: 298, width })).toBe("center");
  });
});

describe("stepPlace", () => {
  it("brings a tucked stack back with the inward key and goes no further out", () => {
    expect(stepPlace("tucked-left", 1)).toBe("left");
    expect(stepPlace("tucked-left", -1)).toBe("tucked-left");
    expect(stepPlace("tucked-right", -1)).toBe("right");
    expect(stepPlace("tucked-right", 1)).toBe("tucked-right");
  });

  it("never tucks from the keyboard", () => {
    expect(stepPlace("left", -1)).toBe("left");
    expect(stepPlace("right", 1)).toBe("right");
    expect(stepPlace("center", 1)).toBe("right");
  });
});

describe("tuckedSide, untuck and isDockPlace", () => {
  it("names the edge and the dock it comes back to", () => {
    expect(tuckedSide("tucked-left")).toBe("left");
    expect(tuckedSide("center")).toBeNull();
    expect(untuck("tucked-right")).toBe("right");
    expect(untuck("center")).toBe("center");
  });

  it("accepts a remembered tuck as well as the three docks", () => {
    expect(isDockPlace("tucked-left")).toBe(true);
    expect(isDockPlace("left")).toBe(true);
    expect(isDockPlace("tucked-top")).toBe(false);
  });
});
