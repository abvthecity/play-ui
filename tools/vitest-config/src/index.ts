import { playwright } from "@vitest/browser-playwright";
import {
  defineConfig,
  type TestProjectInlineConfiguration,
  type ViteUserConfig,
} from "vitest/config";

export interface TestConfigOptions {
  /**
   * Also run `src/**\/*.browser.test.tsx` in headless Chromium, as a second
   * project beside the Node one. Off for packages with no browser tests.
   */
  browser?: boolean;
}

/**
 * The test setup every play-ui package shares: `src/**\/*.test.ts` runs in
 * Node, and with `browser` on, `src/**\/*.browser.test.tsx` runs in headless
 * Chromium through Playwright.
 */
export function defineTestConfig({ browser = false }: TestConfigOptions = {}): ViteUserConfig {
  const node = {
    environment: "node",
    include: ["src/**/*.test.ts"],
  };

  if (!browser) return defineConfig({ test: node });

  // A local Chromium (e.g. a sandbox without Playwright's own download) can be
  // named here; CI installs Playwright's build and leaves this unset.
  const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"];

  const projects: TestProjectInlineConfiguration[] = [
    { extends: true, test: { name: "node", ...node } },
    {
      extends: true,
      test: {
        name: "browser",
        include: ["src/**/*.browser.test.tsx"],
        browser: {
          enabled: true,
          headless: true,
          provider: playwright(executablePath ? { launchOptions: { executablePath } } : {}),
          instances: [{ browser: "chromium" }],
        },
      },
    },
  ];

  return defineConfig({ test: { projects } });
}
