/**
 * Discovers Cosmo users by walking user ids and caching each one's nickname and
 * address into `user_address`.
 *
 * Cosmo ids are sequential from 1, with gaps (deleted accounts) that return
 * USER_NOT_FOUND. Ids already cached with a `cosmo_id` are skipped, so a rerun
 * only asks for what is still missing. Past the highest cached id the walk stops
 * after STOP_AFTER_MISSES consecutive misses, which catches new signups.
 *
 * Env:
 *   DRY_RUN=1      fetch but do not write
 *   FULL=1         also refetch ids that are already cached (picks up renames)
 *   FROM=<id>      first id to check (default 1)
 *   TO=<id>        last id to check (default: until the miss streak ends it)
 *   CONCURRENCY=n  requests in flight (default 5)
 *
 *   DRY_RUN=1 FROM=680000 bun run --env-file=../../.env src/script/discover-cosmo-users.ts
 *   bun run --env-file=../../.env src/script/discover-cosmo-users.ts
 */
import { fetchUserProfile } from "@repo/cosmo/server/user";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { cacheUsers } from "@repo/lib/server/user";
import { isNotNull } from "drizzle-orm";
import { FetchError } from "ofetch";

const DRY_RUN = process.env.DRY_RUN === "1";
const FULL = process.env.FULL === "1";
const FROM = Number(process.env.FROM ?? 1);
const TO = process.env.TO ? Number(process.env.TO) : undefined;
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 5);

const STOP_AFTER_MISSES = 2000;
const WRITE_BATCH = 500;
const LOG_EVERY = 1000;
// the worker's cron rotates the token every few minutes; reread well within that
const TOKEN_TTL_MS = 60_000;
// profiles are artist-scoped, but nickname and address are the same for every artist
const ARTIST = "artms";

const COSMO_KEY = process.env.COSMO_KEY;
if (!COSMO_KEY) {
  console.error("[discover users] COSMO_KEY env var is not set");
  process.exit(1);
}

let token = "";
let tokenReadAt = 0;

async function getToken() {
  if (Date.now() - tokenReadAt < TOKEN_TTL_MS) return token;
  const row = await db.query.accessToken.findFirst();
  if (!row) throw new Error("No access token in db");
  token = row.accessToken;
  tokenReadAt = Date.now();
  return token;
}

type CachedUser = { nickname: string; address: string; cosmoId: number };
type Result =
  | { id: number; status: "found"; user: CachedUser }
  | { id: number; status: "missing" }
  | { id: number; status: "error" };

async function fetchOne(accessToken: string, id: number, key: string): Promise<Result> {
  try {
    const profile = await fetchUserProfile(accessToken, id, ARTIST, key);
    if (!profile.nickname) return { id, status: "missing" };
    return {
      id,
      status: "found",
      user: { nickname: profile.nickname, address: profile.address, cosmoId: profile.id },
    };
  } catch (error) {
    if (
      error instanceof FetchError &&
      (error.data as { error?: { code?: string } } | undefined)?.error?.code === "USER_NOT_FOUND"
    ) {
      return { id, status: "missing" };
    }
    console.error(`[discover users] id ${id}: ${String(error)}`);
    return { id, status: "error" };
  }
}

const known = await db
  .select({ cosmoId: userAddress.cosmoId })
  .from(userAddress)
  .where(isNotNull(userAddress.cosmoId));

const knownIds = new Set<number>();
let maxKnown = 0;
for (const row of known) {
  if (row.cosmoId === null) continue;
  knownIds.add(row.cosmoId);
  if (row.cosmoId > maxKnown) maxKnown = row.cosmoId;
}

console.log(
  `[discover users] ${DRY_RUN ? "DRY RUN — " : ""}${knownIds.size} ids cached, highest ${maxKnown}. ` +
    `Walking from ${FROM}${TO === undefined ? "" : ` to ${TO}`}${FULL ? ", refetching cached ids" : ""}.`,
);

let found = 0;
let missing = 0;
let misses = 0;
let checked = 0;
const failed: number[] = [];
let pending: CachedUser[] = [];

async function flush() {
  if (pending.length === 0) return;
  if (!DRY_RUN) await cacheUsers(pending);
  pending = [];
}

function done(next: number) {
  if (TO !== undefined) return next > TO;
  return next > maxKnown && misses >= STOP_AFTER_MISSES;
}

let next = FROM;
while (!done(next)) {
  const ids: number[] = [];
  while (ids.length < CONCURRENCY && (TO === undefined || next <= TO)) {
    if (FULL || !knownIds.has(next)) ids.push(next);
    next++;
  }
  if (ids.length === 0) break;

  const accessToken = await getToken();
  const results = await Promise.all(ids.map((id) => fetchOne(accessToken, id, COSMO_KEY)));

  for (const result of results) {
    checked++;
    if (result.status === "found") {
      found++;
      misses = 0;
      pending.push(result.user);
      if (DRY_RUN && found <= 20) {
        console.log(
          `[discover users] ${result.id}: ${result.user.nickname} ${result.user.address}`,
        );
      }
    } else if (result.status === "missing") {
      missing++;
      misses++;
    } else {
      failed.push(result.id);
    }

    if (checked % LOG_EVERY === 0) {
      console.log(
        `[discover users] at id ${result.id} · found ${found} · missing ${missing} · errors ${failed.length}`,
      );
    }
  }

  if (pending.length >= WRITE_BATCH) await flush();
}

await flush();

console.log(
  `[discover users] Done at id ${next - 1}. Checked ${checked}, ${DRY_RUN ? "would cache" : "cached"} ${found}, ` +
    `missing ${missing}, errors ${failed.length}.`,
);
if (failed.length > 0) {
  console.log(
    `[discover users] Failed ids (rerun to retry): ${failed.slice(0, 50).join(", ")}${failed.length > 50 ? ", …" : ""}`,
  );
}
process.exit(0);
