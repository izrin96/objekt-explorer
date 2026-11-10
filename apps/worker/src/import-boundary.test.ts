import { expect, test } from "bun:test";
import { join } from "node:path";

// apps/worker/AGENTS.md: env.ts validates the web's whole serverEnv on load and the worker container
// has none of it, so the worker dies on start
const FORBIDDEN = /packages\/api\/src\/(env|services\/redis)\.ts$/;

test("the worker bundle stays clear of @repo/api's env.ts", async () => {
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, "index.ts")],
    target: "bun",
    metafile: true,
  });
  const inputs = Object.keys(result.metafile?.inputs ?? {});
  expect(inputs.length).toBeGreaterThan(100);
  expect(inputs.filter((path) => FORBIDDEN.test(path))).toEqual([]);
});
