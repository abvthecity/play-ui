import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: ["src/index.ts"],
  platform: "neutral",
  dts: true,
  // One file per module, so each keeps its own `"use client"` directive.
  unbundle: true,
  // Workspace consumers read the source; the published package points at `dist`.
  exports: { devExports: true },
  publint: true,
  inputOptions: {
    // Unbundled output keeps every directive; the warning is about bundling.
    onLog(level, log, handler) {
      if (log.code === "MODULE_LEVEL_DIRECTIVE") return;
      handler(level, log);
    },
  },
});

export default config;
