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
  matchAlerts: boolean;
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

export type AlertInput = {
  /** newest first */
  pairs: AlertPair[];
  lists: ReadonlyMap<number, AlertList>;
  /** lowercase addresses by user id */
  addresses: ReadonlyMap<string, ReadonlySet<string>>;
  holdings: Holdings;
  /** keyed by `prefKey`; a missing key takes the type's default */
  prefs: ReadonlyMap<string, boolean>;
  /** keyed by `hiddenKey(user, hidden user)` */
  hidden: ReadonlySet<string>;
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
export const hiddenKey = (userId: string, hiddenUserId: string) => `${userId}:${hiddenUserId}`;

const none: ReadonlySet<string> = new Set();

/** One alert per direction, want list, offer list and collection, after every exclusion. */
export function selectAlerts(input: AlertInput): Alert[] {
  const groups = new Map<string, AlertPair[]>();
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

    if (!recipient.matchAlerts) continue;
    if (!(input.prefs.get(prefKey(recipient.userId, type)) ?? NOTIFICATION_DEFAULTS[type])) {
      continue;
    }
    if (input.hidden.has(hiddenKey(recipient.userId, partner.userId))) continue;

    const { verdict } = collectionVerdict(
      group.map((pair) => ({ listId: pair.offerListId, slug: pair.slug, objektId: pair.objektId })),
      input.addresses.get(offer.userId) ?? none,
      input.holdings,
    );
    if (verdict !== "ok") continue;

    const wanterHolds = [...(input.addresses.get(want.userId) ?? none)].some((address) =>
      input.holdings.copies.has(copyKey(address, first.slug)),
    );
    if (wanterHolds) continue;

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
  return alerts;
}
