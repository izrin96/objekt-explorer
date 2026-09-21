import { paraglideVitePlugin } from "@inlang/paraglide-js";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  return {
    server: {
      port: 3200,
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
                name: "base-ui",
                test: /node_modules[\\/]@base-ui[\\/]/,
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
      paraglideVitePlugin({
        project: "./project.inlang",
        outdir: "./src/paraglide",
        outputStructure: "message-modules",
        cookieName: "PARAGLIDE_LOCALE",
        strategy: ["cookie", "baseLocale"],
      }),
      tailwindcss(),
      tanstackStart({
        srcDirectory: "src",
      }),
      viteReact(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
  };
});
