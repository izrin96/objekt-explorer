import { closeSync, openSync, readSync } from "node:fs";

import { db } from "@repo/db";
import { user } from "@repo/db/schema";
import { eq, or } from "drizzle-orm";

import { type Role, roles } from "../src/permissions";
import { changeRole } from "../src/services/moderation";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

// `bun run --filter` does not pass stdin through, so the answer is read from the terminal itself
function ask(question: string) {
  process.stdout.write(question);
  let fd: number;
  try {
    fd = openSync("/dev/tty", "r");
  } catch {
    return prompt("") ?? "";
  }
  const buffer = Buffer.alloc(1);
  let line = "";
  while (readSync(fd, buffer, 0, 1, null) === 1 && buffer[0] !== 10) line += buffer.toString();
  closeSync(fd);
  return line;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const args = process.argv.slice(2);
const production = args.includes("--production");
const [identifier, role] = args.filter((arg) => arg !== "--production");
if (!identifier || !role) fail("Usage: set-role <username|email|user id> <role> [--production]");
if (!Object.hasOwn(roles, role))
  fail(`Unknown role "${role}"; one of ${Object.keys(roles).join(", ")}`);

const host = new URL(process.env.DATABASE_URL ?? "").hostname;
console.log(`Database host: ${host}`);
if (!LOCAL_HOSTS.has(host) && !production) {
  fail("Refusing a database that is not on this machine; pass --production to mean it.");
}

const [account] = await db
  .select({ id: user.id, name: user.name, username: user.username, role: user.role })
  .from(user)
  .where(or(eq(user.username, identifier), eq(user.email, identifier), eq(user.id, identifier)));
if (!account) fail(`No account matches "${identifier}"`);

const previous = account.role ?? "user";
const answer = ask(
  `Set ${account.name} (${account.username ?? account.id}) from ${previous} to ${role}? [y/N] `,
);
if (answer.trim().toLowerCase() !== "y") fail("Nothing changed.");

await db.transaction((tx) =>
  changeRole(tx, {
    actorId: null,
    userId: account.id,
    role: role as Role,
    previous,
    via: "script",
  }),
);
console.log(`${account.name} is now ${role}.`);
process.exit(0);
