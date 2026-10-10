import { publishUsers } from "@repo/api/realtime";
import { notifyChannel } from "@repo/api/schemas/notification";
import { takesPartInTrade } from "@repo/api/services/trade-lists";
import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { redis } from "../../lib/redis";
import { listProgress, selectAlerts } from "../../lib/want-alert-match";
import { parseState, type State } from "../../lib/want-alert-state";
import { loadContext } from "./context";
import { type Pair, fetchPairs, takeWhole } from "./pairs";
import { recordAlerts } from "./record";

const CURSOR_KEY = "alerts:cursor";
const STATE_KEY = "alerts:state";
const BATCH_SIZE = 5000;
const OVERLAP_MS = 10 * 60 * 1000;
const MARK_LIMIT = 12;
// pairs one run takes from new entries and newly discoverable lists; the rest wait a run
const PAIR_LIMIT = 10_000;

export async function sendWantAlerts() {
  const {
    rows: [clock],
  } = await db.execute<{ now_ms: string; max_id: number | null }>(
    sql`SELECT (extract(epoch FROM now()) * 1000)::bigint AS now_ms, max(id) AS max_id FROM list_entries`,
  );
  const nowMs = Number(clock?.now_ms);
  const maxId = clock?.max_id ?? 0;

  const discoverable = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.discoverable, true), takesPartInTrade));

  const [storedCursor, storedState] = await Promise.all([
    redis.get(CURSOR_KEY),
    redis.get(STATE_KEY),
  ]);

  // the first run only marks where to start, so nothing already listed is announced
  if (storedCursor === null || storedState === null) {
    await saveProgress(maxId, {
      discoverable: discoverable.map((list) => list.id),
      marks: [[nowMs, maxId]],
    });
    console.log(`[Want Alerts] Cursor set to ${maxId}`);
    return;
  }

  const cursor = Number(storedCursor);
  const state = parseState(storedState);
  if (!Number.isInteger(cursor) || state === null) {
    await redis.del(CURSOR_KEY);
    console.error("[Want Alerts] Stored progress unreadable; the next run starts over");
    return;
  }

  const {
    rows: [batch],
  } = await db.execute<{ last_id: number | null }>(sql`
    SELECT max(id) AS last_id FROM (
      SELECT id FROM list_entries WHERE id > ${cursor} ORDER BY id LIMIT ${BATCH_SIZE}
    ) b
  `);
  const batchEnd = batch?.last_id ?? cursor;
  const floor = Math.min(
    cursor,
    state.marks.findLast(([at]) => at <= nowMs - OVERLAP_MS)?.[1] ?? state.marks[0]?.[1] ?? cursor,
  );

  const known = new Set(state.discoverable);
  // the previous run's set, not `updated_at`: that is only touched after the edit commits
  const pending = discoverable.map((list) => list.id).filter((id) => !known.has(id));
  const storedProgress = new Map(state.progress ?? []);

  // late commits under the cursor are re-read whole; that window is minutes of entries
  const overlap = await fetchPairs(sql`e.id > ${floor} AND e.id <= ${cursor}`, "entry", null);

  const fresh = await takeWhole(sql`e.id > ${cursor} AND e.id <= ${batchEnd}`, "entry", PAIR_LIMIT);
  const nextCursor = fresh.complete ? batchEnd : (fresh.taken.at(-1)?.entryId ?? cursor);

  // entries above the floor reach the cursor's reads; a new list's older ones come only here
  const afterProgress = storedProgress.size
    ? sql`AND e.id > coalesce((
        SELECT n.after FROM unnest(
          ${sql.param([...storedProgress.keys()])}::int[], ${sql.param([...storedProgress.values()])}::int[]
        ) AS n(list_id, after) WHERE n.list_id = e.list_id
      ), 0)`
    : sql``;
  const newLists =
    pending.length === 0
      ? { complete: true, taken: [] as Pair[] }
      : await takeWhole(
          sql`e.list_id = ANY(${sql.param(pending)}::int[]) AND e.id <= ${floor} ${afterProgress}`,
          "list",
          Math.max(PAIR_LIMIT - fresh.taken.length, 0),
        );
  const resume = listProgress(pending, storedProgress, newLists.taken, newLists.complete);

  const pairs = [...overlap, ...fresh.taken, ...newLists.taken].toSorted(
    (a, b) => b.entryId - a.entryId,
  );
  const alerts = pairs.length === 0 ? [] : selectAlerts(await loadContext(pairs));
  const notified = alerts.length === 0 ? [] : await recordAlerts(alerts, new Date(nowMs));

  await Promise.all([
    ...notified.map((userId) => redis.publish(notifyChannel(userId), "1")),
    publishUsers(notified, { type: "notifications_changed" }),
  ]);

  const unfinished = new Set(pending.filter((id) => !resume.done.includes(id)));
  await saveProgress(nextCursor, {
    discoverable: discoverable.map((list) => list.id).filter((id) => !unfinished.has(id)),
    marks: [...state.marks, [nowMs, maxId] as [number, number]].slice(-MARK_LIMIT),
    progress: [...resume.progress],
  });

  console.log(
    `[Want Alerts] ${pairs.length} pairs, ${alerts.length} alerts, ${notified.length} users notified; cursor ${cursor} → ${nextCursor}; ${unfinished.size} lists to resume`,
  );
}

async function saveProgress(cursor: number, state: State) {
  await redis.set(STATE_KEY, JSON.stringify(state));
  await redis.set(CURSOR_KEY, String(cursor));
}
