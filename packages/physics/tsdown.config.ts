import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: ["src/index.ts"],
  platform: "neutral",
  dts: true,
  // One file per module, so a consumer's bundler keeps only what it imports.
  unbundle: true,
  // Workspace consumers read the source; the published package points at `dist`.
  exports: {
    devExports: true,
    // Name each entry's declarations under `types` rather than leaving
    // TypeScript to find the `.d.ts` beside the `.js`.
    customExports(exports, { isPublish }) {
      if (!isPublish) return exports;

      return Object.fromEntries(
        Object.entries(exports).map(([key, target]) =>
          typeof target === "string" && target.endsWith(".js")
            ? [key, { types: target.replace(/\.js$/u, ".d.ts"), default: target }]
            : [key, target],
        ),
      );
    },
  },
  publint: true,
  // Check that every published entry resolves to types, in every resolution mode.
  attw: { profile: "esm-only", level: "error" },
});

export default config;
