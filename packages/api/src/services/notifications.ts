import { db } from "@repo/db";
import { notification, notificationPref } from "@repo/db/schema";
import { and, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type * as z from "zod";

import { attachEarlier, GROUPED_TYPES, type RankedNote } from "../lib/notification-groups";
import { shownCancelReason } from "../lib/offer-rules";
import { iso } from "../lib/time";
import {
  EARLIER_LIMIT,
  KIND_TYPES,
  type listNotificationsInputSchema,
  LISTED_NOTIFICATION_TYPES,
  ALERT_MATCH_DEFAULT,
  ALERT_TYPES,
  type AlertMatchMode,
  type AlertType,
  NOTIFICATION_DEFAULTS,
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_TYPES,
  type NoteEvent,
  type Notification,
  type NotificationType,
  notificationSchema,
  RETENTION_DAYS,
} from "../schemas/notification";
import { loadIdentities } from "./identities";
import { fetchCollectionsBySlug } from "./list";

/** A head with the rest of its trade or conversation; only rows of its own type go under it. */
function withGroup(
  item: Notification,
  updates: number | undefined,
  under: readonly Notification[],
): Notification {
  if (updates === undefined) return item;
  if (item.type === "offer") {
    const earlier = under.filter(
      (note): note is Extract<NoteEvent, { type: "offer" }> => note.type === "offer",
    );
    return { ...item, updates, earlier };
  }
  if (item.type === "trade") {
    const earlier = under.filter(
      (note): note is Extract<NoteEvent, { type: "trade" }> => note.type === "trade",
    );
    return { ...item, updates, earlier };
  }
  return item;
}

export async function listNotifications(
  userId: string,
  { kind, cursor }: z.infer<typeof listNotificationsInputSchema>,
) {
  const key = sql<string>`CASE WHEN ${notification.type} IN (${sql.join(
    GROUPED_TYPES.map((type) => sql`${type}`),
    sql`, `,
  )}) THEN ${notification.groupKey} ELSE 'row:' || ${notification.id} END`;
  // kind and retention filter before ranking, the cursor after, so a group split across pages
  // never shows an older row as a head of its own
  const ranked = db.$with("ranked").as(
    db
      .select({
        id: notification.id,
        type: notification.type,
        payload: notification.payload,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
        key: key.as("key"),
        rank: sql<number>`(row_number() OVER (PARTITION BY ${key} ORDER BY ${notification.createdAt} DESC, ${notification.id} DESC))::int`.as(
          "rank",
        ),
        updates: sql<number>`(count(*) OVER (PARTITION BY ${key}))::int - 1`.as("updates"),
      })
      .from(notification)
      .where(
        and(
          eq(notification.userId, userId),
          kind === "all" ? undefined : inArray(notification.type, [...KIND_TYPES[kind]]),
          // the weekly prune may not have reached a read notification past retention yet
          or(
            isNull(notification.readAt),
            gt(notification.createdAt, sql`now() - make_interval(days => ${RETENTION_DAYS})`),
          ),
        ),
      ),
  );
  const heads = db.$with("heads").as(
    db
      .select({
        headKey: sql<string>`${ranked.key}`.as("head_key"),
        headAt: sql<string>`${ranked.createdAt}`.as("head_at"),
        headId: sql<number>`${ranked.id}`.as("head_id"),
      })
      .from(ranked)
      .where(
        and(
          eq(ranked.rank, 1),
          cursor === undefined
            ? undefined
            : sql`(${ranked.createdAt}, ${ranked.id}) < (${cursor.at}::timestamptz, ${cursor.id})`,
        ),
      )
      .orderBy(desc(ranked.createdAt), desc(ranked.id))
      .limit(NOTIFICATION_PAGE_SIZE + 1),
  );
  // each page's heads and up to EARLIER_LIMIT older rows of their groups, in one read
  const rows = await db
    .with(ranked, heads)
    .select({
      id: ranked.id,
      type: ranked.type,
      payload: ranked.payload,
      readAt: ranked.readAt,
      createdAt: ranked.createdAt,
      key: ranked.key,
      rank: ranked.rank,
      updates: ranked.updates,
    })
    .from(ranked)
    .innerJoin(heads, eq(ranked.key, heads.headKey))
    .where(lte(ranked.rank, EARLIER_LIMIT + 1))
    .orderBy(desc(heads.headAt), desc(heads.headId), ranked.rank);

  const headRows = rows.filter((row) => row.rank === 1);
  const page = headRows.slice(0, NOTIFICATION_PAGE_SIZE);
  const last = page.at(-1);
  const onPage = new Set(page.map((row) => row.key));

  // a type this server does not know yet is dropped, not an error
  const ranks = rows.flatMap((row): RankedNote<Notification>[] => {
    if (!onPage.has(row.key)) return [];
    const parsed = notificationSchema.safeParse({
      id: row.id,
      type: row.type,
      payload: row.payload,
      readAt: iso(row.readAt),
      createdAt: new Date(row.createdAt).toISOString(),
    });
    return parsed.success ? [{ key: row.key, updates: row.updates, item: parsed.data }] : [];
  });
  const firstOf = new Set(page.map((row) => row.id));
  const headNotes = ranks.filter(({ item }) => firstOf.has(item.id));
  const earlierNotes = ranks.filter(({ item }) => !firstOf.has(item.id));

  // a partner is named as their account is now, so a deleted one reads "Deleted account"
  const identities = await loadIdentities(
    ranks.flatMap(({ item }) =>
      item.type === "offer" || item.type === "trade" ? [item.payload.partner.userId] : [],
    ),
  );
  const withCurrentPartner = <N extends Notification>(item: N): N => {
    if (item.type !== "offer" && item.type !== "trade") return item;
    const known = identities.get(item.payload.partner.userId);
    const partner = {
      ...item.payload.partner,
      name: known?.identity.name ?? item.payload.partner.name,
      image: known?.account.image ?? null,
    };
    return item.type === "offer"
      ? {
          ...item,
          payload: { ...item.payload, partner, reason: shownCancelReason(item.payload.reason) },
        }
      : { ...item, payload: { ...item.payload, partner } };
  };
  const items = attachEarlier(headNotes, earlierNotes).map(({ head, updates, earlier }) =>
    withGroup(
      withCurrentPartner(head.item),
      updates,
      (earlier ?? []).map(({ item }) => withCurrentPartner(item)),
    ),
  );

  const collections = await fetchCollectionsBySlug(
    items
      .flatMap((item) => [item, ...("earlier" in item ? (item.earlier ?? []) : [])])
      .flatMap((item) => {
        if (item.type === "want_match" || item.type === "have_wanted") {
          return item.payload.latest.map((match) => match.collectionSlug);
        }
        // rows written before an offer or trade named its objekts have none
        return item.type === "offer" || item.type === "trade" ? (item.payload.objekts ?? []) : [];
      }),
    [],
  );

  return {
    items,
    nextCursor:
      rows.length > NOTIFICATION_PAGE_SIZE && last ? { at: last.createdAt, id: last.id } : null,
    collections: Object.fromEntries(
      collections.map((c) => [
        c.slug,
        {
          member: c.member,
          artist: c.artist,
          season: c.season,
          collectionNo: c.collectionNo,
          thumbnailImage: c.thumbnailImage,
        },
      ]),
    ),
  };
}

export function unreadNotificationCount(userId: string) {
  return db.$count(
    notification,
    and(
      eq(notification.userId, userId),
      isNull(notification.readAt),
      inArray(notification.type, [...LISTED_NOTIFICATION_TYPES]),
    ),
  );
}

/** Each type on or off, and what each list alert matches; a missing row or null reads as the default. */
export async function notificationPrefs(userId: string) {
  const rows = await db
    .select({
      type: notificationPref.type,
      enabled: notificationPref.enabled,
      match: notificationPref.match,
    })
    .from(notificationPref)
    .where(eq(notificationPref.userId, userId));
  const stored = new Map(rows.map((row) => [row.type, row]));
  return {
    enabled: Object.fromEntries(
      NOTIFICATION_TYPES.map((type) => [
        type,
        stored.get(type)?.enabled ?? NOTIFICATION_DEFAULTS[type],
      ]),
    ) as Record<NotificationType, boolean>,
    match: Object.fromEntries(
      ALERT_TYPES.map((type) => [type, stored.get(type)?.match ?? ALERT_MATCH_DEFAULT]),
    ) as Record<AlertType, AlertMatchMode>,
  };
}
