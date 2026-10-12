import { describe, expect, it } from "vitest";

import { restPose } from "./pose.ts";

/** Where each card in the stack rests, by its depth. */
describe("restPose", () => {
  it("drops each depth by half what the scale takes plus the offset", () => {
    const pose = restPose(2, {
      depthScale: 0.05,
      depthOffset: 10,
      depthShade: 0.2,
      cardHeight: 400,
    });

    expect(pose.s).toBeCloseTo(0.9);
    expect(pose.y).toBeCloseTo(2 * (10 + 10));
    expect(pose.shade).toBeCloseTo(0.4);
  });

  it("fans the cards beneath to alternating sides, the front one flat", () => {
    const geometry = {
      depthScale: 0.05,
      depthOffset: 10,
      depthShade: 0.2,
      depthRotation: 3,
      depthSpread: 12,
      cardHeight: 400,
    };

    expect(restPose(0, geometry)).toMatchObject({ x: 0, r: 0 });
    expect(restPose(1, geometry)).toMatchObject({ x: 12, r: 3 });
    expect(restPose(2, geometry).r).toBeCloseTo(-4);
    expect(restPose(2, geometry).x).toBeCloseTo(-16);
    expect(restPose(3, geometry).r).toBeCloseTo(5);
  });
});
