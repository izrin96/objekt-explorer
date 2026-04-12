import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
    suspicious: "warn",
    pedantic: "off",
    perf: "warn",
    style: "off",
  },
  rules: {
    "eslint/no-unused-vars": "off",
    "eslint/no-console": "off",
    "eslint/prefer-const": "warn",
    "eslint/no-var": "error",
    "eslint/eqeqeq": "warn",
    "typescript/no-unused-vars": "off",
    "typescript/no-explicit-any": "off",
    "typescript/no-floating-promises": "warn",
    "typescript/no-non-null-assertion": "off",
    "typescript/prefer-ts-expect-error": "warn",
    "typescript/consistent-type-imports": "warn",
    "typescript/no-unsafe-type-assertion": "off",
    "typescript/unbound-method": "off",
    "typescript/restrict-template-expressions": "off",
    "typescript/no-unnecessary-type-assertion": "off",
    "typescript/consistent-return": "off",
    "no-await-in-loop": "off",
    "no-shadow": "off",
  },
});
