import { defineConfig, type UserConfig } from "tsdown";

/**
 * The build every published play-ui package shares: unbundled ESM with
 * declarations, devExports for the workspace, and publint plus attw checks.
 * Pass `overrides` for anything a package needs on top; they replace the
 * matching top-level option.
 */
export function defineLibraryConfig(overrides: UserConfig = {}): UserConfig {
  return defineConfig({
    entry: ["src/index.ts"],
    platform: "neutral",
    dts: true,
    // One file per module, so a consumer's bundler keeps only what it imports
    // and each module keeps its own `"use client"` directive.
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
    inputOptions: {
      // Unbundled output keeps every directive; the warning is about bundling.
      onLog(level, log, handler) {
        if (log.code === "MODULE_LEVEL_DIRECTIVE") return;
        handler(level, log);
      },
    },
    ...overrides,
  });
}
