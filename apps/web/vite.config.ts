import { paraglideVitePlugin } from "@inlang/paraglide-js";
import babel from "@rolldown/plugin-babel";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { type Plugin, defineConfig } from "vite";

/**
 * Uploads the client's source maps to GlitchTip and deletes them, since `server.ts` serves all of
 * `dist/client`. Off unless every variable is set, so a build without them is unchanged.
 */
function sourceMapUpload() {
  const { SENTRY_AUTH_TOKEN, SENTRY_URL, SENTRY_ORG, SENTRY_PROJECT, SENTRY_RELEASE } = process.env;
  if (!SENTRY_AUTH_TOKEN || !SENTRY_URL || !SENTRY_ORG || !SENTRY_PROJECT || !SENTRY_RELEASE) {
    return null;
  }
  const plugins = sentryVitePlugin({
    url: SENTRY_URL,
    authToken: SENTRY_AUTH_TOKEN,
    org: SENTRY_ORG,
    project: SENTRY_PROJECT,
    // the server reads SENTRY_RELEASE at runtime and hands it to the browser; GlitchTip has no
    // repository integration to set commits on
    release: { name: SENTRY_RELEASE, inject: false, setCommits: false, deploy: false },
    sourcemaps: { filesToDeleteAfterUpload: ["./dist/client/**/*.map"] },
    // otherwise it reports its own usage to sentry.io
    telemetry: false,
  });
  for (const plugin of plugins) {
    (plugin as Plugin).applyToEnvironment = (environment) => environment.name === "client";
  }
  return plugins;
}

export default defineConfig(({ command }) => {
  const uploadPlugins = command === "build" ? sourceMapUpload() : null;
  return {
    server: {
      port: 3200,
      proxy: {
        "/connection": { target: "http://localhost:8000", ws: true },
      },
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
    environments: {
      // "hidden": no sourceMappingURL in the shipped files; written only to be uploaded
      client: { build: { sourcemap: uploadPlugins ? "hidden" : false } },
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
        router: {
          // the plugin splits only component, errorComponent and notFoundComponent by default, so
          // a route's pendingComponent pulled its whole import chain into the entry chunk
          codeSplittingOptions: {
            defaultBehavior: [
              ["component"],
              ["pendingComponent"],
              ["errorComponent"],
              ["notFoundComponent"],
            ],
          },
        },
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
      uploadPlugins,
    ],
  };
});
