import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

// oxlint's RuleTester refuses to run under Bun, so each case runs the real CLI over one file
const pluginPath = join(import.meta.dir, "plugin.ts");
const oxlintBin = join(dirname(require.resolve("oxlint/package.json")), "bin", "oxlint");

function lint(
  rule: string,
  code: string,
  filename = "case.tsx",
  files: Record<string, string> = {},
): number {
  const dir = mkdtempSync(join(tmpdir(), "repo-lint-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  writeFileSync(
    join(dir, ".oxlintrc.json"),
    JSON.stringify({
      categories: { correctness: "off" },
      jsPlugins: [pluginPath],
      rules: { [`repo/${rule}`]: "error" },
    }),
  );
  writeFileSync(join(dir, filename), code);
  const result = Bun.spawnSync(
    ["node", oxlintBin, "-c", join(dir, ".oxlintrc.json"), "--format", "json", join(dir, filename)],
    { cwd: import.meta.dir },
  );
  const report = JSON.parse(result.stdout.toString()) as { diagnostics: { code: string }[] };
  return report.diagnostics.filter((d) => d.code === `repo(${rule})`).length;
}

test("zod-namespace-import", () => {
  expect(lint("zod-namespace-import", 'import * as z from "zod";')).toBe(0);
  expect(lint("zod-namespace-import", 'import { ZodError } from "zod";')).toBe(0);
  expect(lint("zod-namespace-import", 'import { z } from "zod";')).toBe(1);
  expect(lint("zod-namespace-import", 'import { z, ZodError } from "zod/v4";')).toBe(1);
});

test("no-enum-or-class", () => {
  expect(lint("no-enum-or-class", "export class EncryptionError extends Error {}")).toBe(0);
  expect(lint("no-enum-or-class", "export const Kind = { A: 1 } as const;")).toBe(0);
  expect(lint("no-enum-or-class", "enum Kind { A }")).toBe(1);
  expect(lint("no-enum-or-class", "export class Store {}")).toBe(1);
  expect(lint("no-enum-or-class", "export const Store = class extends Base {};")).toBe(1);
});

test("no-as-child", () => {
  expect(lint("no-as-child", "<DialogTrigger render={<Button />} />")).toBe(0);
  expect(lint("no-as-child", "<DialogTrigger asChild><Button /></DialogTrigger>")).toBe(1);
});

test("suspense-queries-enabled", () => {
  expect(lint("suspense-queries-enabled", "useQuery({ queryKey: [1], enabled: false });")).toBe(0);
  expect(lint("suspense-queries-enabled", "useSuspenseQueries({ queries: [a, b] });")).toBe(0);
  expect(
    lint("suspense-queries-enabled", "useSuspenseQueries({ queries: [{ ...a, enabled: ok }] });"),
  ).toBe(1);
  expect(
    lint(
      "suspense-queries-enabled",
      "useSuspenseQueries({ queries: ids.map((id) => ({ ...q(id), enabled: !!id })) });",
    ),
  ).toBe(1);
});

test("store-selector", () => {
  const files = {
    "src/stores/settings.ts":
      "export const useSettings = create<S>()(persist(() => ({}), {}));\nexport function useColumns() {}\n",
    "src/features/search-store.ts": "export const useSearch = create(() => ({}));\n",
  };
  const check = (code: string) =>
    lint(
      "store-selector",
      `import { useSettings, useColumns } from "@/stores/settings";\nimport { useSearch as useFound } from "./search-store";\n${code}`,
      "src/features/case.tsx",
      files,
    );
  expect(check("useSettings((s) => s.columns);")).toBe(0);
  expect(check("useSettings.getState();")).toBe(0);
  expect(check("useColumns();")).toBe(0);
  expect(check("useSettings();")).toBe(1);
  expect(check("useFound();")).toBe(1);
});

test("no-subtle-token", () => {
  expect(lint("no-subtle-token", '<div className="bg-destructive/8 text-subtle" />')).toBe(0);
  expect(lint("no-subtle-token", '<div className="rounded bg-success-subtle" />')).toBe(1);
  expect(lint("no-subtle-token", "const c = `p-2 hover:text-warning-subtle`;")).toBe(1);
});

test("user-address-link-write", () => {
  const ok = "await db.update(userAddress).set({ bio: null }).where(w);";
  expect(lint("user-address-link-write", ok, "case.ts")).toBe(0);
  expect(lint("user-address-link-write", "await db.update(lists).set({ userId: id });")).toBe(0);
  expect(
    lint(
      "user-address-link-write",
      "await tx.update(userAddress).set({ userId: null }).where(w);",
      "case.ts",
    ),
  ).toBe(1);
  expect(
    lint(
      "user-address-link-write",
      "await tx.update(userAddress).set(to ? { userId: to } : { bio: null });",
      "case.ts",
    ),
  ).toBe(1);
  expect(
    lint(
      "user-address-link-write",
      "await db.insert(userAddress).values({ address, userId }).onConflictDoNothing();",
      "case.ts",
    ),
  ).toBe(1);
});

test("cron-safe-run", () => {
  const head = "const runA = safeRun('a', a);\n";
  expect(lint("cron-safe-run", `${head}crons.push(cron('* * * * *', runA));`, "case.ts")).toBe(0);
  expect(
    lint("cron-safe-run", "crons.push(cron('* * * * *', safeRun('b', () => b())));", "case.ts"),
  ).toBe(0);
  expect(lint("cron-safe-run", "crons.push(cron('* * * * *', runB));", "case.ts")).toBe(1);
  expect(lint("cron-safe-run", "cron('* * * * *', async () => b());", "case.ts")).toBe(1);
});
