import { describe, expect, it } from "vitest";

import { resolveOptions } from "./options.ts";

describe("resolveOptions", () => {
  it("treats an explicit undefined option as the default", () => {
    expect(resolveOptions({ threshold: undefined, maxDepth: 5 })).toMatchObject({
      threshold: 0.32,
      maxDepth: 5,
    });
  });
});
