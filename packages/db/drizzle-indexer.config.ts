import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/indexer/schema.ts",
  out: "./indexer-migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.INDEXER_DATABASE_URL!,
  },
});
