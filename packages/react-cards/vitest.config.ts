import { playwright } from "@vitest/browser-playwright";
import { defineConfig, type ViteUserConfig } from "vitest/config";

// A local Chromium (e.g. a sandbox without Playwright's own download) can be
// named here; CI installs Playwright's build and leaves this unset.
const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"];

const config: ViteUserConfig = defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["test/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["test/browser/*.test.tsx"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(executablePath ? { launchOptions: { executablePath } } : {}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});

export default config;
