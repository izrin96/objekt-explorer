import baseConfig from "@repo/lint/oxlint.config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [baseConfig],
  ignorePatterns: [
    "node_modules",
    ".turbo",
    "dist",
    "src/routeTree.gen.ts",
    "src/paraglide",
    ".tanstack",
  ],
  rules: {
    // a stray non-component export makes Fast Refresh reload the page on every edit of the file
    "react/only-export-components": ["warn", { allowConstantExport: true }],
  },
  overrides: [
    {
      // TanStack's router plugin handles route files' HMR; ui/ is vendored verbatim
      files: ["src/routes/**", "src/components/ui/**"],
      rules: { "react/only-export-components": "off" },
    },
    {
      // vendored verbatim; the effect is FileUploadItemPreview's object URL, a part no caller uses
      files: ["src/components/ui/file-upload.tsx"],
      rules: { "react/set-state-in-effect": "off" },
    },
  ],
});
