import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { defineConfig, type UserConfig } from "vite";

const config: UserConfig = defineConfig({
  server: { port: 3000 },
  resolve: { tsconfigPaths: true },
  plugins: [
    fumadocsMdx(),
    // Every page is static: the build renders each one the crawler reaches.
    tanstackStart({ prerender: { enabled: true, crawlLinks: true } }),
    react(),
  ],
});

export default config;
