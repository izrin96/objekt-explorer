// PostToolUse hook: format the file Claude just edited, so formatting never drifts between turns.
// oxfmt.config.ts decides what is ignored; a failure never blocks the edit.
const input = await Bun.stdin.json().catch(() => ({}));
const file: unknown = input.tool_input?.file_path;
if (typeof file !== "string" || !(await Bun.file(file).exists())) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
await Bun.$`node_modules/.bin/oxfmt --no-error-on-unmatched-pattern ${file}`.cwd(root).quiet().nothrow();
