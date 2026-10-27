// PreToolUse hook (Skill, Edit|MultiEdit|Write) and UserPromptExpansion: an agent loads
// vercel-react-best-practices before it edits a React component in apps/web (AGENTS.md, Skills).
// Each skill load is recorded per session and per subagent, since a subagent does not see the
// skills its parent loaded; an edit with no record is blocked once, with the reason. Exit 2 blocks.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const REQUIRED = "vercel-react-best-practices";

const input = await Bun.stdin.json().catch(() => ({}));
const session: string = input.session_id ?? "unknown";
const agent: string = input.agent_id ?? "main";
const dir = join(tmpdir(), "claude-skill-loads");
const record = join(dir, `${session}-${agent}`);

// the Skill tool's input names the skill; the whole input is kept, so its exact field never matters
if (input.hook_event_name === "UserPromptExpansion" || input.tool_name === "Skill") {
  const loaded = JSON.stringify(input.tool_input ?? input.command_name ?? input.prompt ?? "");
  mkdirSync(dir, { recursive: true });
  appendFileSync(record, `${loaded}\n`);
  process.exit(0);
}

const file: unknown = input.tool_input?.file_path;
if (typeof file !== "string") process.exit(0);
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const path = relative(root, file);
const react =
  path.startsWith("apps/web/src/") &&
  path.endsWith(".tsx") &&
  // vendored registry copies stay verbatim, and the route tree is generated
  !path.startsWith("apps/web/src/components/ui/") &&
  !path.endsWith("routeTree.gen.tsx");
if (!react) process.exit(0);

if (existsSync(record) && readFileSync(record, "utf8").includes(REQUIRED)) process.exit(0);

console.error(
  `Blocked: load the ${REQUIRED} skill (Skill tool) before editing React components in apps/web, then retry this edit. AGENTS.md, Skills and specs, lists the other skills for UI work.`,
);
process.exit(2);
