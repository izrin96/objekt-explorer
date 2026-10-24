import { collectionVerdict, copyKey, type Holdings } from "@repo/api/lib/trade-rank";
import {
  ALERT_MATCH_DEFAULT,
  type AlertMatch,
  type AlertMatchMode,
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
  /** a sale list set to Sell only: never a swap, so never Can swap */
  sale: boolean;
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
  /** keyed by `prefKey`; a missing key is `ALERT_MATCH_DEFAULT` */
  matches: ReadonlyMap<string, AlertMatchMode>;
};

export type AlertKey = { wantListId: number; sourceListId: number; collectionSlug: string };

export type Alert = {
  type: NotificationType;
  userId: string;
  list: { id: number; slug: string; name: string };
  key: AlertKey;
  match: AlertMatch;
  /** the recipient's choice the alert was made under */
  mode: AlertMatchMode;
};

export const alertKeyId = (key: AlertKey) =>
  `${key.wantListId}:${key.sourceListId}:${key.collectionSlug}`;

export const prefKey = (userId: string, type: NotificationType) => `${userId}:${type}`;
/** A partner who can swap with the recipient over the lists the alert on `listId` opens. */
export const mutualKey = (recipientId: string, listId: number, partnerId: string) =>
  `${recipientId}:${listId}:${partnerId}`;

const none: ReadonlySet<string> = new Set();

type Judged<P> =
  | { kind: "skip" }
  | { kind: "unowned"; group: P[] }
  | {
      kind: "ok";
      group: P[];
      alert: Omit<Alert, "mode">;
      mode: AlertMatchMode;
      partnerId: string;
    };

function groupPairs<P extends AlertPair>(pairs: P[]) {
  const groups = new Map<string, P[]>();
  for (const pair of pairs) {
    const id = `${pair.direction}:${alertKeyId({
      wantListId: pair.wantListId,
      sourceListId: pair.offerListId,
      collectionSlug: pair.slug,
    })}`;
    const group = groups.get(id);
    if (group) group.push(pair);
    else groups.set(id, [pair]);
  }
  return [...groups.values()];
}

/** Every check but mutuality, for one direction, want list, offer list and collection. */
function judge<P extends AlertPair>(input: AlertInput<P>, group: P[]): Judged<P> {
  const [first] = group;
  if (!first) return { kind: "skip" };
  const offer = input.lists.get(first.offerListId);
  const want = input.lists.get(first.wantListId);
  if (!offer || !want || offer.userId === want.userId) return { kind: "skip" };

  const forward = first.direction === "forward";
  const type: NotificationType = forward ? "want_match" : "have_wanted";
  const recipient = forward ? want : offer;
  const partner = forward ? offer : want;
  const key = prefKey(recipient.userId, type);

  if (!(input.prefs.get(key) ?? NOTIFICATION_DEFAULTS[type])) return { kind: "skip" };
  const mode = input.matches.get(key) ?? ALERT_MATCH_DEFAULT;
  // a sale can never become a swap, so no recheck either
  if (mode === "mutual" && offer.sale) return { kind: "skip" };

  const wanterHolds = [...(input.addresses.get(want.userId) ?? none)].some((address) =>
    input.holdings.copies.has(copyKey(address, first.slug)),
  );
  if (wanterHolds) return { kind: "skip" };

  const { verdict } = collectionVerdict(
    group.map((pair) => ({ listId: pair.offerListId, slug: pair.slug, objektId: pair.objektId })),
    input.addresses.get(offer.userId) ?? none,
    input.holdings,
  );
  if (verdict !== "ok") return { kind: "unowned", group };

  return {
    kind: "ok",
    group,
    mode,
    partnerId: partner.userId,
    alert: {
      type,
      userId: recipient.userId,
      list: { id: recipient.id, slug: recipient.slug, name: recipient.name },
      key: { wantListId: want.id, sourceListId: offer.id, collectionSlug: first.slug },
      match: {
        collectionSlug: first.slug,
        partnerName: partner.ownerName,
        sourceListSlug: partner.slug,
      },
    },
  };
}

export type MutualQuestion = {
  recipientId: string;
  list: { id: number; slug: string };
  partnerIds: Set<string>;
};

/**
 * For each Can swap recipient and alert list, the partners whose pairs pass every other check:
 * the question is asked over the lists that alert's link opens.
 */
export function mutualQuestions<P extends AlertPair>(input: AlertInput<P>) {
  const asks = new Map<string, MutualQuestion>();
  for (const group of groupPairs(input.pairs)) {
    const judged = judge(input, group);
    if (judged.kind !== "ok" || judged.mode !== "mutual") continue;
    const { userId, list } = judged.alert;
    const id = `${userId}:${list.id}`;
    const ask = asks.get(id) ?? {
      recipientId: userId,
      list: { id: list.id, slug: list.slug },
      partnerIds: new Set<string>(),
    };
    ask.partnerIds.add(judged.partnerId);
    asks.set(id, ask);
  }
  return [...asks.values()];
}

/**
 * One alert per direction, want list, offer list and collection, after every exclusion.
 * `unowned` are the pairs left out only because the offer's owner cannot trade it yet, and
 * `notMutual` those left out only because the recipient is on Can swap and `mutual` (keyed by
 * `mutualKey`) does not hold the partner.
 */
export function selectAlerts<P extends AlertPair>(
  input: AlertInput<P>,
  mutual: ReadonlySet<string> = none,
): { alerts: Alert[]; unowned: P[]; notMutual: P[] } {
  const alerts: Alert[] = [];
  const unowned: P[] = [];
  const notMutual: P[] = [];
  for (const group of groupPairs(input.pairs)) {
    const judged = judge(input, group);
    if (judged.kind === "unowned") unowned.push(...judged.group);
    if (judged.kind !== "ok") continue;
    if (
      judged.mode === "mutual" &&
      !mutual.has(mutualKey(judged.alert.userId, judged.alert.list.id, judged.partnerId))
    ) {
      notMutual.push(...judged.group);
      continue;
    }
    alerts.push({ ...judged.alert, mode: judged.mode });
  }
  return { alerts, unowned, notMutual };
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
