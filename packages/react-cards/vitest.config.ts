import { defineTestConfig } from "@play-ui/vitest-config";
import type { ViteUserConfig } from "vitest/config";

const config: ViteUserConfig = defineTestConfig({ browser: true });

export default config;
