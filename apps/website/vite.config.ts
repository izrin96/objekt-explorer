import optimizeLocales from "@react-aria/optimize-locales-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { intlayer } from "vite-intlayer";

export default defineConfig(({ command }) => {
  return {
    server: {
      port: 3000,
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rolldownOptions: {
        output: {
          minify: true,
          codeSplitting: {
            groups: [
              {
                name: "vendor",
                test: /node_modules[\\/]react(-dom)?[\\/]/,
                priority: 20,
              },
              {
                name: "ui",
                test: /node_modules[\\/]@react-stately|@react-aria|@react-spectrum|react-aria-components[\\/]/,
                priority: 15,
              },
            ],
          },
        },
        external: ["bun"],
      },
    },
    ssr: {
      noExternal: command === "build" ? true : undefined,
      external: ["bun"],
    },
    optimizeDeps: {
      exclude: ["bun"],
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
      {
        ...optimizeLocales.vite({
          locales: ["en"],
        }),
        enforce: "pre",
      },
    ],
  };
});
