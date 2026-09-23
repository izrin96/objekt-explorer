import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * The lab has no backend. `/api/*` is proxied to the live objekt.top deployment
 * so the drawer can read real metadata / serials / transfers; everything the
 * proxy cannot answer falls back to the local fixtures.
 */
export default defineConfig({
  server: {
    port: 3100,
    proxy: {
      "/api": {
        target: "https://objekt.top",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [tailwindcss(), viteReact()],
});
