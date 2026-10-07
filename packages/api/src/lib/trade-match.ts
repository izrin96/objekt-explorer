/**
 * An open leg as the verifier matches it. `objektId` null is any copy of `collectionId`.
 * The address sets are lowercase: the leg's snapshot plus the party's current links.
 */
export type MatchLeg = {
  id: number;
  objektId: string | null;
  collectionId: string | null;
  /** the offer's `created_at`: a transfer before it never counts */
  windowStart: string;
  /**
   * The trade's `accepted_at`. A transfer before it may verify the leg, but never breaks
   * it: the accept rechecked ownership, so an earlier move out (and back) was resolved.
   */
  acceptedAt: string;
  giver: ReadonlySet<string>;
  receiver: ReadonlySet<string>;
};

export type MatchTransfer = {
  id: string;
  from: string;
  to: string;
  timestamp: string;
  hash: string;
  objektId: string | null;
  collectionId: string | null;
};

export type LegResult =
  | { kind: "verified"; transferId: string; txHash: string; objektId: string; at: string }
  | { kind: "broken"; transferId: string }
  | { kind: "pending" };

const time = (at: string) => new Date(at).getTime();

function byTime(a: MatchTransfer, b: MatchTransfer) {
  return time(a.timestamp) - time(b.timestamp) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

const verified = (transfer: MatchTransfer): LegResult => ({
  kind: "verified",
  transferId: transfer.id,
  txHash: transfer.hash,
  objektId: transfer.objektId ?? "",
  at: transfer.timestamp,
});

/**
 * Decides each leg from the transfers. `used` holds transfer ids already recorded on a
 * leg, so one transfer verifies at most one leg anywhere. Specific legs go first: their
 * token can only ever satisfy them, while any-copy legs can take another token.
 */
export function matchLegs(
  legs: MatchLeg[],
  transfers: MatchTransfer[],
  used: ReadonlySet<string> = new Set(),
): Map<number, LegResult> {
  const taken = new Set(used);
  const sorted = transfers
    .map((t) => Object.assign({}, t, { from: t.from.toLowerCase(), to: t.to.toLowerCase() }))
    .toSorted(byTime);
  const results = new Map<number, LegResult>();
  const ordered = legs.toSorted(
    (a, b) => Number(a.objektId === null) - Number(b.objektId === null) || a.id - b.id,
  );

  for (const leg of ordered) {
    const giver = lower(leg.giver);
    const receiver = lower(leg.receiver);
    const start = time(leg.windowStart);
    const accepted = time(leg.acceptedAt);
    const inWindow = (t: MatchTransfer) => time(t.timestamp) >= start && !taken.has(t.id);

    if (leg.objektId !== null) {
      let result: LegResult = { kind: "pending" };
      for (const t of sorted) {
        if (t.objektId !== leg.objektId || !inWindow(t)) continue;
        if (giver.has(t.from) && giver.has(t.to)) continue;
        if (giver.has(t.from) && receiver.has(t.to)) {
          result = verified(t);
          break;
        }
        if (time(t.timestamp) < accepted) continue;
        result = { kind: "broken", transferId: t.id };
        break;
      }
      if (result.kind === "verified") taken.add(result.transferId);
      results.set(leg.id, result);
      continue;
    }

    const match = sorted.find(
      (t) =>
        t.collectionId === leg.collectionId &&
        inWindow(t) &&
        giver.has(t.from) &&
        receiver.has(t.to),
    );
    if (match) taken.add(match.id);
    results.set(leg.id, match ? verified(match) : { kind: "pending" });
  }
  return results;
}

function lower(addresses: ReadonlySet<string>) {
  return new Set([...addresses].map((address) => address.toLowerCase()));
}

export type TradeOutcome =
  | { status: "in_progress" }
  | { status: "completed" }
  | { status: "cancelled"; reason: "token_moved" }
  | { status: "failed" };

/**
 * A trade's state after a run. `alreadyVerified` counts legs verified by earlier runs;
 * `results` cover the legs still open.
 */
export function tradeOutcome(results: LegResult[], alreadyVerified: number): TradeOutcome {
  const verifiedNow = results.filter((r) => r.kind === "verified").length;
  if (results.some((r) => r.kind === "broken")) {
    return alreadyVerified + verifiedNow > 0
      ? { status: "failed" }
      : { status: "cancelled", reason: "token_moved" };
  }
  return results.every((r) => r.kind === "verified")
    ? { status: "completed" }
    : { status: "in_progress" };
}

export type WatchSet = { objekts: ReadonlySet<string>; collections: ReadonlySet<string> };

/** One transfer as the indexer publishes it on `transfers`: Subsquid entities, nested. */
type PublishedTransfer = {
  tokenId?: string | null;
  objekt?: { id?: string | null } | null;
  collection?: { id?: string | null } | null;
};

/** True when a published batch holds a transfer the open legs or offers care about. */
export function batchMatters(message: string, watch: WatchSet) {
  let batch: unknown;
  try {
    batch = JSON.parse(message);
  } catch {
    return false;
  }
  if (!Array.isArray(batch)) return false;
  return (batch as PublishedTransfer[]).some((t) => {
    const objektId = t?.objekt?.id ?? t?.tokenId;
    const collectionId = t?.collection?.id;
    return (
      (objektId != null && watch.objekts.has(objektId)) ||
      (collectionId != null && watch.collections.has(collectionId))
    );
  });
}
