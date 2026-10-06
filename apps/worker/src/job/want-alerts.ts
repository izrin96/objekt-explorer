import { groupKey, mergePayload } from "@repo/api/lib/notification-group";
import { copyKey, type Holdings } from "@repo/api/lib/trade-rank";
import {
  type AlertMatch,
  alertPayloadSchema,
  NOTIFICATION_TYPES,
  notifyChannel,
} from "@repo/api/schemas/notification";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import {
  hiddenTradePartner,
  lists,
  notification,
  notificationPref,
  user,
  userAddress,
  wantAlertSent,
} from "@repo/db/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { redis } from "../lib/redis";
import {
  type Alert,
  alertKeyId,
  type AlertList,
  type AlertPair,
  hiddenKey,
  prefKey,
  selectAlerts,
} from "../lib/want-alert-match";

const CURSOR_KEY = "alerts:cursor";
const STATE_KEY = "alerts:state";
const BATCH_SIZE = 5000;
const OVERLAP_MS = 10 * 60 * 1000;
const MARK_LIMIT = 12;

/**
 * `marks` are each run's time and highest visible entry id. An id is assigned when
 * its row is inserted but seen only at commit, so the run re-reads every id above
 * the mark from at least `OVERLAP_MS` ago; `want_alert_sent` absorbs the repeats.
 */
type State = { discoverable: number[]; marks: [number, number][] };

type PairRow = {
  direction: "forward" | "reverse";
  offer_list_id: number;
  want_list_id: number;
  slug: string;
  objekt_id: string | null;
};

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
    .where(and(eq(lists.discoverable, true), inArray(lists.listTypeNew, ["have", "sale", "want"])));

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
  const nextCursor = batch?.last_id ?? cursor;
  const floor = Math.min(
    cursor,
    state.marks.findLast(([at]) => at <= nowMs - OVERLAP_MS)?.[1] ?? state.marks[0]?.[1] ?? cursor,
  );

  const known = new Set(state.discoverable);
  // the previous run's set, not `updated_at`: that is only touched after the edit commits
  const newlyDiscoverable = discoverable.map((list) => list.id).filter((id) => !known.has(id));

  const pairs = await fetchPairs(floor, nextCursor, newlyDiscoverable);
  const alerts = pairs.length === 0 ? [] : selectAlerts(await loadContext(pairs));
  const notified = alerts.length === 0 ? [] : await recordAlerts(alerts, new Date(nowMs));

  await Promise.all(notified.map((userId) => redis.publish(notifyChannel(userId), "1")));

  await saveProgress(nextCursor, {
    discoverable: discoverable.map((list) => list.id),
    marks: [...state.marks, [nowMs, maxId] as [number, number]].slice(-MARK_LIMIT),
  });

  console.log(
    `[Want Alerts] ${pairs.length} pairs, ${alerts.length} alerts, ${notified.length} users notified; cursor ${cursor} → ${nextCursor}`,
  );
}

function parseState(stored: string): State | null {
  try {
    const value = JSON.parse(stored) as Partial<State>;
    const valid = Array.isArray(value.discoverable) && Array.isArray(value.marks);
    return valid ? (value as State) : null;
  } catch {
    return null;
  }
}

async function saveProgress(cursor: number, state: State) {
  await redis.set(STATE_KEY, JSON.stringify(state));
  await redis.set(CURSOR_KEY, String(cursor));
}

/** Unsent pairs whose new side is an entry above `floor` or on a list just made discoverable. */
async function fetchPairs(floor: number, upTo: number, newlyDiscoverable: number[]) {
  const result = await db.execute<PairRow>(sql`
    WITH cand AS (
      SELECT e.id, e.list_id, e.collection_slug AS slug, e.objekt_id, l.list_type_new AS type, l.user_id
      FROM list_entries e
      JOIN lists l ON l.id = e.list_id
      WHERE l.discoverable
        AND l.list_type_new IN ('have', 'sale', 'want')
        AND e.collection_slug IS NOT NULL
        AND (
          (e.id > ${floor} AND e.id <= ${upTo})
          OR e.list_id = ANY(${sql.param(newlyDiscoverable)}::int[])
        )
    ),
    pairs AS (
      SELECT c.id AS entry_id, 'forward' AS direction, c.list_id AS offer_list_id,
        w.list_id AS want_list_id, c.slug, c.objekt_id
      FROM cand c
      JOIN list_entries w ON w.collection_slug = c.slug
      JOIN lists wl ON wl.id = w.list_id
      WHERE c.type IN ('have', 'sale')
        AND wl.list_type_new = 'want' AND wl.match_alerts AND wl.user_id <> c.user_id
      UNION ALL
      SELECT c.id, 'reverse', o.list_id, c.list_id, c.slug, o.objekt_id
      FROM cand c
      JOIN list_entries o ON o.collection_slug = c.slug
      JOIN lists ol ON ol.id = o.list_id
      WHERE c.type = 'want'
        AND ol.list_type_new IN ('have', 'sale') AND ol.match_alerts AND ol.user_id <> c.user_id
    )
    SELECT direction, offer_list_id, want_list_id, slug, objekt_id FROM pairs p
    WHERE NOT EXISTS (
      SELECT 1 FROM want_alert_sent s
      WHERE s.want_list_id = p.want_list_id
        AND s.source_list_id = p.offer_list_id
        AND s.collection_slug = p.slug
    )
    ORDER BY entry_id DESC
  `);

  return result.rows.map((row): AlertPair => ({
    direction: row.direction,
    offerListId: row.offer_list_id,
    wantListId: row.want_list_id,
    slug: row.slug,
    objektId: row.objekt_id,
  }));
}

const unique = <T>(values: T[]) => [...new Set(values)];

async function loadContext(pairs: AlertPair[]) {
  const listIds = unique(pairs.flatMap((pair) => [pair.offerListId, pair.wantListId]));
  const listRows = await db
    .select({
      id: lists.id,
      userId: lists.userId,
      slug: lists.slug,
      name: lists.name,
      matchAlerts: lists.matchAlerts,
      profileAddress: lists.profileAddress,
    })
    .from(lists)
    .where(inArray(lists.id, listIds));
  const userIds = unique(listRows.map((list) => list.userId));

  const [users, addressRows, prefRows, hiddenRows] = await Promise.all([
    db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIds)),
    db
      .select({
        userId: userAddress.userId,
        address: userAddress.address,
        nickname: userAddress.nickname,
        hideNickname: userAddress.hideNickname,
      })
      .from(userAddress)
      .where(inArray(userAddress.userId, userIds)),
    db
      .select()
      .from(notificationPref)
      .where(
        and(
          inArray(notificationPref.userId, userIds),
          inArray(notificationPref.type, [...NOTIFICATION_TYPES]),
        ),
      ),
    db.select().from(hiddenTradePartner).where(inArray(hiddenTradePartner.userId, userIds)),
  ]);

  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  const nicknameOf = new Map(
    addressRows.map((row) => [row.address.toLowerCase(), row.hideNickname ? null : row.nickname]),
  );
  const addresses = new Map<string, Set<string>>();
  for (const row of addressRows) {
    if (!row.userId) continue;
    const set = addresses.get(row.userId) ?? new Set<string>();
    set.add(row.address.toLowerCase());
    addresses.set(row.userId, set);
  }

  const alertLists = new Map(
    listRows.map((list): [number, AlertList] => [
      list.id,
      {
        id: list.id,
        userId: list.userId,
        slug: list.slug,
        name: list.name,
        matchAlerts: list.matchAlerts,
        ownerName:
          (list.profileAddress ? nicknameOf.get(list.profileAddress.toLowerCase()) : null) ??
          nameOf.get(list.userId) ??
          "",
      },
    ]),
  );

  const owners = unique(listRows.flatMap((list) => Array.from(addresses.get(list.userId) ?? [])));
  const holdings = await fetchHoldings(
    unique(pairs.flatMap((pair) => (pair.objektId ? [pair.objektId] : []))),
    unique(pairs.map((pair) => pair.slug)),
    owners,
  );

  return {
    pairs,
    lists: alertLists,
    addresses,
    holdings,
    prefs: new Map(
      prefRows.map((row) => [prefKey(row.userId, row.type as Alert["type"]), row.enabled]),
    ),
    hidden: new Set(hiddenRows.map((row) => hiddenKey(row.userId, row.hiddenUserId))),
  };
}

type HoldingRow = { owner: string; key: string; transferable: boolean; token: boolean };

/** Every copy counts here, transferable or not: a wanter holding any copy is not alerted. */
async function fetchHoldings(
  tokenIds: string[],
  slugs: string[],
  owners: string[],
): Promise<Holdings> {
  const objekts = new Map<string, { owner: string; transferable: boolean }>();
  const copies = new Map<string, boolean>();
  if (tokenIds.length === 0 && owners.length === 0) return { objekts, copies };

  const result = await indexer.execute<HoldingRow>(sql`
    SELECT o.owner, c.slug AS key, bool_or(o.transferable) AS transferable, false AS token
    FROM collection c
    JOIN objekt o ON o.collection_id = c.id
    WHERE c.slug = ANY(${sql.param(slugs)}::text[]) AND o.owner = ANY(${sql.param(owners)}::text[])
    GROUP BY o.owner, c.slug
    UNION ALL
    SELECT owner, id, transferable, true FROM objekt
    WHERE id = ANY(${sql.param(tokenIds)}::varchar[])
  `);

  for (const row of result.rows) {
    const owner = row.owner.toLowerCase();
    if (row.token) objekts.set(row.key, { owner, transferable: row.transferable });
    else copies.set(copyKey(owner, row.key), row.transferable);
  }
  return { objekts, copies };
}

async function recordAlerts(alerts: Alert[], now: Date) {
  return db.transaction(async (tx) => {
    // runs that overlap queue here, and the later one finds its keys already sent
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('want-alerts'))`);

    const inserted = await tx
      .insert(wantAlertSent)
      .values(alerts.map((alert) => alert.key))
      .onConflictDoNothing()
      .returning();
    // a key sent in this batch serves both directions; a later batch finds it sent
    const fresh = new Set(inserted.map(alertKeyId));

    const groups = new Map<string, { alert: Alert; key: string; matches: AlertMatch[] }>();
    for (const alert of alerts) {
      if (!fresh.has(alertKeyId(alert.key))) continue;
      const key = groupKey(alert.type, alert.list.id, now);
      const group = groups.get(`${alert.userId}:${key}`);
      if (group) group.matches.push(alert.match);
      else groups.set(`${alert.userId}:${key}`, { alert, key, matches: [alert.match] });
    }

    for (const { alert, key, matches } of groups.values()) {
      const [existing] = await tx
        .select({ id: notification.id, payload: notification.payload })
        .from(notification)
        .where(
          and(
            eq(notification.userId, alert.userId),
            eq(notification.groupKey, key),
            isNull(notification.readAt),
          ),
        )
        .for("update");

      const previous = existing ? alertPayloadSchema.safeParse(existing.payload) : null;
      const payload = mergePayload(previous?.success ? previous.data : null, alert.list, matches);

      if (existing) {
        // a fresh match lifts the notification back to the top of the list
        await tx
          .update(notification)
          .set({ payload, createdAt: sql`now()` })
          .where(eq(notification.id, existing.id));
      } else {
        await tx
          .insert(notification)
          .values({ userId: alert.userId, type: alert.type, payload, groupKey: key });
      }
    }

    return unique([...groups.values()].map(({ alert }) => alert.userId));
  });
}
