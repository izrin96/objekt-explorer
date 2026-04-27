import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { intlayer } from "vite-intlayer";

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    target: "es2020",
  },
  ssr: {
    external: ["bun"],
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    intlayer(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
      router: {
        routeFileIgnorePattern: ".content.(ts|tsx|js|mjs|cjs|jsx|json|jsonc|json5)$",
      },
    }),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});
