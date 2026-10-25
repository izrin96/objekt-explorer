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
    functions: ["cn", "cva"],
  },
  sortImports: {
    type: "natural",
  },
  // third-party skills, OpenSpec artifacts and design notes are prose, not code;
  // drizzle-kit writes the migrations and their snapshots
  ignorePatterns: [
    "node_modules",
    "*.gen.ts",
    ".agents",
    ".claude",
    "openspec",
    "design",
    "packages/db/migrations",
    "packages/db/indexer-migrations",
  ],
});
