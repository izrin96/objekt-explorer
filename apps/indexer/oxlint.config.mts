import baseConfig from "@repo/lint/oxlint.config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [baseConfig],
  ignorePatterns: ["node_modules", ".turbo", "lib", "src/model/generated/**", "db/migrations/**"],
  overrides: [
    {
      // squid-evm-typegen output: its contract wrappers are classes
      files: ["src/abi/**"],
      rules: { "repo/no-enum-or-class": "off" },
    },
  ],
});
