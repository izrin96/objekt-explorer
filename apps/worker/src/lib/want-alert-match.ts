import { collectionVerdict, copyKey, type Holdings } from "@repo/api/lib/trade-rank";
import {
  type AlertMatch,
  NOTIFICATION_DEFAULTS,
  type NotificationType,
} from "@repo/api/schemas/notification";

export type AlertList = {
  id: number;
  userId: string;
  slug: string;
  name: string;
  /** what a notification calls the list's owner */
  ownerName: string;
};

/**
 * A have or sale entry and a want list holding its collection. `forward` when the
 * offer is the new entry (the want list's owner is told), `reverse` when the want is.
 */
export type AlertPair = {
  direction: "forward" | "reverse";
  offerListId: number;
  wantListId: number;
  slug: string;
  objektId: string | null;
};

export type AlertInput<P extends AlertPair = AlertPair> = {
  /** newest first */
  pairs: P[];
  lists: ReadonlyMap<number, AlertList>;
  /** lowercase addresses by user id */
  addresses: ReadonlyMap<string, ReadonlySet<string>>;
  holdings: Holdings;
  /** keyed by `prefKey`; a missing key takes the type's default */
  prefs: ReadonlyMap<string, boolean>;
};

export type AlertKey = { wantListId: number; sourceListId: number; collectionSlug: string };

export type Alert = {
  type: NotificationType;
  userId: string;
  list: { id: number; slug: string; name: string };
  key: AlertKey;
  match: AlertMatch;
};

export const alertKeyId = (key: AlertKey) =>
  `${key.wantListId}:${key.sourceListId}:${key.collectionSlug}`;

export const prefKey = (userId: string, type: NotificationType) => `${userId}:${type}`;

const none: ReadonlySet<string> = new Set();

/**
 * One alert per direction, want list, offer list and collection, after every exclusion.
 * `unowned` are the pairs left out only because the offer's owner cannot trade it yet.
 */
export function selectAlerts<P extends AlertPair>(
  input: AlertInput<P>,
): { alerts: Alert[]; unowned: P[] } {
  const groups = new Map<string, P[]>();
  for (const pair of input.pairs) {
    const id = `${pair.direction}:${alertKeyId({
      wantListId: pair.wantListId,
      sourceListId: pair.offerListId,
      collectionSlug: pair.slug,
    })}`;
    const group = groups.get(id);
    if (group) group.push(pair);
    else groups.set(id, [pair]);
  }

  const alerts: Alert[] = [];
  const unowned: P[] = [];
  for (const group of groups.values()) {
    const [first] = group;
    if (!first) continue;
    const offer = input.lists.get(first.offerListId);
    const want = input.lists.get(first.wantListId);
    if (!offer || !want || offer.userId === want.userId) continue;

    const forward = first.direction === "forward";
    const type: NotificationType = forward ? "want_match" : "have_wanted";
    const recipient = forward ? want : offer;
    const partner = forward ? offer : want;

    if (!(input.prefs.get(prefKey(recipient.userId, type)) ?? NOTIFICATION_DEFAULTS[type])) {
      continue;
    }

    const wanterHolds = [...(input.addresses.get(want.userId) ?? none)].some((address) =>
      input.holdings.copies.has(copyKey(address, first.slug)),
    );
    if (wanterHolds) continue;

    const { verdict } = collectionVerdict(
      group.map((pair) => ({ listId: pair.offerListId, slug: pair.slug, objektId: pair.objektId })),
      input.addresses.get(offer.userId) ?? none,
      input.holdings,
    );
    if (verdict !== "ok") {
      unowned.push(...group);
      continue;
    }

    alerts.push({
      type,
      userId: recipient.userId,
      list: { id: recipient.id, slug: recipient.slug, name: recipient.name },
      key: { wantListId: want.id, sourceListId: offer.id, collectionSlug: first.slug },
      match: {
        collectionSlug: first.slug,
        partnerName: partner.ownerName,
        sourceListSlug: partner.slug,
      },
    });
  }
  return { alerts, unowned };
}

export type Cut<T> =
  | { complete: true; taken: T[] }
  /** `oversized` is set when the first entry alone passes the limit; it is read again whole */
  | { complete: false; taken: T[]; oversized: number | null };

/**
 * The first `limit` rows cut back to whole entries, so a run never stops partway through an
 * entry's pairs. `rows` are grouped by entry and hold one more than `limit` when there were more.
 */
export function wholeEntries<T extends { entryId: number }>(rows: T[], limit: number): Cut<T> {
  if (rows.length <= limit) return { complete: true, taken: rows };
  const cutEntry = rows[limit]!.entryId;
  const taken = rows.slice(0, limit).filter((row) => row.entryId !== cutEntry);
  return { complete: false, taken, oversized: taken.length === 0 ? cutEntry : null };
}

/**
 * Lists made discoverable are read in list id, then entry id, order. When the run stopped
 * short, every list before the last one it reached is done, and that one resumes after its
 * last whole entry; `consumed` is never empty then, since the first entry is always taken.
 */
export function listProgress(
  pending: number[],
  progress: ReadonlyMap<number, number>,
  consumed: { entryId: number; listId: number }[],
  complete: boolean,
): { done: number[]; progress: Map<number, number> } {
  const last = consumed.at(-1);
  if (complete || !last) return { done: pending, progress: new Map() };
  const done = pending.filter((id) => id < last.listId);
  const next = new Map<number, number>();
  for (const id of pending) {
    const after = progress.get(id);
    if (id > last.listId && after !== undefined) next.set(id, after);
  }
  next.set(last.listId, last.entryId);
  return { done, progress: next };
}
