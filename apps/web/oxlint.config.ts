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
  overrides: [
    {
      // vendored verbatim; the effect is FileUploadItemPreview's object URL, a part no caller uses
      files: ["src/components/ui/file-upload.tsx"],
      rules: { "react/set-state-in-effect": "off" },
    },
  ],
});
