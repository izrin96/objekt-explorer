import { db } from "@repo/db";
import { workerProgress } from "@repo/db/schema";
import { eq, sql } from "drizzle-orm";

import { redis } from "../../lib/redis";
import { parseState, type State } from "../../lib/want-alert-state";
import type { RunProgress } from "./record";

const NAME = "want-alerts";
const SEED_CURSOR_KEY = "alerts:cursor";
const SEED_STATE_KEY = "alerts:state";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type Progress =
  | { kind: "row"; cursor: number; state: State }
  | { kind: "seed"; cursor: number; state: State }
  | { kind: "first"; seed: "none" | "unparsable" | "above max id" }
  | { kind: "unreadable" };

export async function loadProgress(maxId: number): Promise<Progress> {
  const [row] = await db.select().from(workerProgress).where(eq(workerProgress.name, NAME));
  if (row) {
    const state = parseState(row.state);
    if (state === null || !Number.isInteger(row.cursor)) return { kind: "unreadable" };
    return { kind: "row", cursor: row.cursor, state };
  }

  const [storedCursor, storedState] = await Promise.all([
    redis.get(SEED_CURSOR_KEY),
    redis.get(SEED_STATE_KEY),
  ]);
  if (storedCursor === null || storedState === null) return { kind: "first", seed: "none" };

  const cursor = Number(storedCursor);
  const state = parseSeedState(storedState);
  if (!Number.isInteger(cursor) || state === null) return { kind: "first", seed: "unparsable" };
  // an id above this database's own highest means the keys describe a bigger database
  if (cursor > maxId || state.marks.some(([, id]) => id > maxId)) {
    return { kind: "first", seed: "above max id" };
  }
  return { kind: "seed", cursor, state };
}

function parseSeedState(stored: string) {
  try {
    return parseState(JSON.parse(stored));
  } catch {
    return null;
  }
}

/** A first run only inserts, so one that loses a race never overwrites a seeded row. */
export async function saveProgress(tx: Tx, { cursor, state, first }: RunProgress) {
  const insert = tx.insert(workerProgress).values({ name: NAME, cursor, state });
  if (first) {
    await insert.onConflictDoNothing();
    return;
  }
  await insert.onConflictDoUpdate({
    target: workerProgress.name,
    set: { cursor, state, updatedAt: sql`now()` },
  });
}
