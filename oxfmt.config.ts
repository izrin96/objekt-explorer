import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  jsxSingleQuote: false,
  quoteProps: "as-needed",
  trailingComma: "all",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",
  sortTailwindcss: {
    attributes: ["classList"],
    functions: ["twMerge", "twJoin", "tv", "composeRenderProps", "composeTailwindRenderProps"],
  },
  sortImports: {
    type: "natural",
  },
  // third-party skills, OpenSpec artifacts and design notes are prose, not code
  ignorePatterns: ["node_modules", "*.gen.ts", ".agents", ".claude", "openspec", "design"],
});
