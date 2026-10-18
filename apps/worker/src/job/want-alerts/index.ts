import { publishUsers } from "@repo/api/realtime";
import { takesPartInTrade } from "@repo/api/services/trade-lists";
import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { heartbeat, log } from "../../lib/log";
import { listProgress, selectAlerts } from "../../lib/want-alert-match";
import { keepMarks, overlapFloor, type State } from "../../lib/want-alert-state";
import { loadContext } from "./context";
import { type Pair, fetchPairs, takeWhole } from "./pairs";
import { loadProgress } from "./progress";
import { recordRun } from "./record";

const BATCH_SIZE = 5000;
// pairs one run takes from new entries and newly discoverable lists; the rest wait a run
const PAIR_LIMIT = 10_000;

const alertsLog = log("want-alerts");
const alertsBeat = heartbeat(alertsLog);

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

  const progress = await loadProgress();
  if (progress.kind === "unreadable") {
    alertsLog.error("Stored progress unreadable; leaving it as it is");
    return;
  }

  // the first run only marks where to start, so nothing already listed is announced
  if (progress.kind === "first") {
    await recordRun([], new Date(nowMs), {
      cursor: maxId,
      state: { discoverable: discoverable.map((list) => list.id), marks: [[nowMs, maxId]] },
      first: true,
    });
    alertsLog.info(`Cursor set to ${maxId} (first run)`);
    return;
  }

  const { cursor, state } = progress;

  const {
    rows: [batch],
  } = await db.execute<{ last_id: number | null }>(sql`
    SELECT max(id) AS last_id FROM (
      SELECT id FROM list_entries WHERE id > ${cursor} ORDER BY id LIMIT ${BATCH_SIZE}
    ) b
  `);
  const batchEnd = batch?.last_id ?? cursor;
  const floor = overlapFloor(state.marks, cursor);

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
  const unfinished = new Set(pending.filter((id) => !resume.done.includes(id)));
  const next: State = {
    discoverable: discoverable.map((list) => list.id).filter((id) => !unfinished.has(id)),
    marks: keepMarks(state.marks, [nowMs, maxId]),
    progress: [...resume.progress],
  };
  const notified = await recordRun(alerts, new Date(nowMs), {
    cursor: nextCursor,
    state: next,
    first: false,
  });

  await publishUsers(notified, { type: "notifications_changed" });

  const sinceLast = Math.round((nowMs - (state.marks.at(-1)?.[0] ?? nowMs)) / 60_000);
  alertsBeat.count("runs");
  alertsBeat.count("pairs", pairs.length);
  alertsBeat.count("alerts", alerts.length);
  alertsBeat.max("most behind", maxId - nextCursor);
  // a run that sent nothing is counted in the hourly line only
  if (alerts.length > 0) {
    alertsLog.info(
      `${pairs.length} pairs, ${alerts.length} alerts, ${notified.length} users notified; cursor ${cursor} → ${nextCursor}; behind ${maxId - nextCursor}; since last run ${sinceLast} min; ${unfinished.size} lists to resume`,
    );
  }
  alertsBeat.flush();
}
