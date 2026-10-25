import { db } from "@repo/db";
import { workerProgress } from "@repo/db/schema";
import { eq, sql } from "drizzle-orm";

import { parseState, type State } from "../../lib/want-alert-state";
import type { RunProgress } from "./record";

const NAME = "want-alerts";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type Progress =
  | { kind: "row"; cursor: number; state: State }
  | { kind: "first" }
  | { kind: "unreadable" };

export async function loadProgress(): Promise<Progress> {
  const [row] = await db.select().from(workerProgress).where(eq(workerProgress.name, NAME));
  if (!row) return { kind: "first" };
  const state = parseState(row.state);
  if (state === null || !Number.isInteger(row.cursor)) return { kind: "unreadable" };
  return { kind: "row", cursor: row.cursor, state };
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
