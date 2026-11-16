import baseConfig from "@repo/lint/oxlint.config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [baseConfig],
  ignorePatterns: ["node_modules", ".turbo", "dist"],
  rules: {
    "repo/cron-safe-run": "error",
    "no-console": "error",
  },
  overrides: [
    {
      // a script's output is the point; log.ts is the sink every job logs through
      files: ["src/script/**", "src/lib/log.ts"],
      rules: { "no-console": "off" },
    },
  ],
});
