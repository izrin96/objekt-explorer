import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["react", "import"],
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
    "react/set-state-in-effect": "warn",
    "react/refs": "warn",
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
    "oxc/no-map-spread": "warn",
  },
});
