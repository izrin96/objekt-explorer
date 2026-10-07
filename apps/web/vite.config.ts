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
      // found late through server-function files; listing them up front stops a mid-session
      // re-bundle that leaves open tabs importing renamed chunks
      include: ["drizzle-orm", "drizzle-orm/node-postgres", "drizzle-orm/pg-core"],
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
        importProtection: {
          // workspace packages resolve outside the vite root, so their importers
          // are matched by absolute path
          include: ["src/**", /\/packages\/[^/]+\/src\//],
          client: {
            specifiers: [
              "bun",
              "pg",
              "drizzle-orm/node-postgres",
              "@better-auth/**",
              // better-auth's client entries are `better-auth/react` and `better-auth/client/*`
              /^better-auth(?!\/(react|client)(\/|$))(\/|$)/,
            ],
            // setting `files` replaces the defaults, so `*.server.*` is listed again
            files: [
              "**/*.server.*",
              "src/lib/server/**",
              /\/packages\/db\//,
              /\/packages\/api\/src\/(?!schemas\/|constants\.ts$)/,
              /\/packages\/(lib|cosmo)\/src\/server\//,
            ],
          },
        },
      }),
      viteReact(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
  };
});
