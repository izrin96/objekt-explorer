import baseConfig from "@repo/lint/oxlint.config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [baseConfig],
  ignorePatterns: ["node_modules", ".turbo", "dist"],
  overrides: [
    {
      files: ["src/routers/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@repo/db", "@repo/db/**"],
                message:
                  "A router checks input and the caller, then calls a service: database reads and writes live in src/services/.",
              },
            ],
          },
        ],
      },
    },
    {
      // the only writers of user_address.user_id, each recording address_link_event
      files: [
        "src/services/account/cosmo-link.ts",
        "src/services/moderation/links.ts",
        "src/services/account/anonymize.ts",
      ],
      rules: { "repo/user-address-link-write": "off" },
    },
  ],
});
