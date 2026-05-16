import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["react", "import"],
  options: {
    typeAware: true,
  },
  rules: {
    "eslint/no-unused-vars": "off",
    "typescript/consistent-type-imports": [
      "warn",
      {
        fixStyle: "inline-type-imports",
      },
    ],
    "typescript/unbound-method": "off",
    "typescript/restrict-template-expressions": "off",
  },
});
