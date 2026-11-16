import { fileURLToPath } from "node:url";

import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["react", "import"],
  // absolute, since a config that extends this one would resolve a relative path against itself
  jsPlugins: [fileURLToPath(new URL("./plugin.ts", import.meta.url))],
  options: {
    typeAware: true,
  },
  categories: {
    correctness: "error",
  },
  rules: {
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "off",
    "react/jsx-key": "warn",
    "react/set-state-in-effect": "error",
    "react/refs": "error",
    "react/incompatible-library": "warn",
    "eslint/no-unused-vars": "off",
    "typescript/consistent-type-imports": [
      "warn",
      {
        fixStyle: "inline-type-imports",
      },
    ],
    "typescript/unbound-method": "off",
    "typescript/restrict-template-expressions": "off",
    "import/no-duplicates": "error",
    // type-only cycles are erased at build time and cost nothing at runtime
    "import/no-cycle": ["error", { ignoreTypes: true }],
    "oxc/no-map-spread": "warn",
    "repo/zod-namespace-import": "error",
    "repo/no-enum-or-class": "error",
    "repo/user-address-link-write": "error",
  },
});
