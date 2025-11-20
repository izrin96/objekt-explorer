import optimizeLocales from "@react-aria/optimize-locales-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
// import { nodePolyfills } from "vite-plugin-node-polyfills";
import tsConfigPaths from "vite-tsconfig-paths";

function optimizeRacLocales() {
  return {
    ...optimizeLocales.vite({
      locales: ["en-US"],
    }),
    enforce: "pre",
  } as const;
}

export default defineConfig(async () => {
  // await import("./src/lib/env/client");
  // await import("./src/lib/env/server");

  return {
    plugins: [
      // nodePolyfills({
      //   // include: ["util", "string_decoder"],
      // }),
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tanstackStart(),
      nitro({
        noExternals: true,
      }),
      viteReact({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
      tailwindcss(),
      optimizeRacLocales(),
    ],
    // optimizeDeps: {
    //   include: ["react", "react-dom", "react-aria-components"],
    // },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // "react-vendor": ["react", "react-dom"],
            // "rac-vendor": ["react-aria-components"],
            // "wagmi-vendor": ["wagmi", "viem"],
          },
        },
        external: [
          "puppeteer-core",
          "@aws-sdk/client-s3",
          "@aws-sdk/client-ses",
          "@aws-sdk/s3-request-presigner",
          "pg",
          "@privy-io/node",
        ],
        // onLog(level, log, handler) {
        //   // ignore /*#__PURE__*/
        //   if (log.message.includes("/*#__PURE__*/")) {
        //     return;
        //   }
        //   handler(level, log);
        // },
      },
    },
  };
});
