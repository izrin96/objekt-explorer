// Stop hook: format and lint the TypeScript files changed since HEAD, per package,
// so lint errors reach Claude before the turn ends. Exit 2 blocks the stop and
// feeds stderr back; warnings never block.
import { existsSync } from "node:fs";
import { join } from "node:path";

const input = await Bun.stdin.json().catch(() => ({}));
if (input.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

async function git(...args: string[]) {
  const out = await Bun.$`git ${args}`.cwd(root).quiet().nothrow().text();
  return out.split("\n").filter(Boolean);
}

const changed = new Set([
  ...(await git("diff", "--name-only", "HEAD")),
  ...(await git("ls-files", "--others", "--exclude-standard")),
]);

const byPackage = new Map<string, string[]>();
for (const file of changed) {
  const match = /^((?:apps|packages)\/[^/]+)\/(.+\.(?:ts|tsx|mts))$/.exec(file);
  if (!match || !existsSync(join(root, file))) continue;
  const [, pkg, rel] = match;
  if (rel.endsWith("routeTree.gen.ts") || rel.includes("/paraglide/")) continue;
  byPackage.set(pkg, [...(byPackage.get(pkg) ?? []), rel]);
}
if (byPackage.size === 0) process.exit(0);

const allFiles = [...byPackage].flatMap(([pkg, files]) => files.map((f) => `${pkg}/${f}`));
await Bun.$`bunx oxfmt ${allFiles}`.cwd(root).quiet().nothrow();

const failures: string[] = [];
for (const [pkg, files] of byPackage) {
  const dir = join(root, pkg);
  const config = existsSync(join(dir, "oxlint.config.mts")) ? ["--config", "./oxlint.config.mts"] : [];
  const result = await Bun.$`bunx oxlint --type-aware --quiet --format=agent ${config} ${files}`
    .cwd(dir)
    .quiet()
    .nothrow();
  if (result.exitCode !== 0) {
    failures.push(`## ${pkg}\n${result.stdout.toString()}${result.stderr.toString()}`.trim());
  }
}

if (failures.length > 0) {
  console.error(`oxlint errors in changed files — fix them before finishing:\n\n${failures.join("\n\n")}`);
  process.exit(2);
}
