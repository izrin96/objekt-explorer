/**
 * An open leg as the verifier matches it. `objektId` null is any copy of `collectionId`.
 * The address sets are lowercase: the leg's snapshot plus the party's current links.
 */
export type MatchLeg = {
  id: number;
  objektId: string | null;
  collectionId: string | null;
  /** the offer's `created_at`: a transfer of the leg's own token before it never counts */
  windowStart: string;
  /**
   * `copyWindowStart(acceptedAt)`: where any-copy legs start counting. A copy sent before the
   * accept may be for another deal; the margin covers the accepting party sending just before.
   */
  copyWindowStart: string;
  /**
   * The trade's `accepted_at`. A move away after it breaks the leg at once. One before it
   * breaks the leg only if the token never came back: the accept read the indexer, which
   * can lag the chain, so it may not have seen that move.
   */
  acceptedAt: string;
  giver: ReadonlySet<string>;
  receiver: ReadonlySet<string>;
};

export type MatchTransfer = {
  /** the indexer's row id: random, and new after a re-index */
  id: string;
  from: string;
  to: string;
  timestamp: string;
  hash: string;
  tokenId: string;
  objektId: string | null;
  collectionId: string | null;
};

const COPY_WINDOW_MARGIN_MS = 10 * 60 * 1000;

export const copyWindowStart = (acceptedAt: string) =>
  new Date(new Date(acceptedAt).getTime() - COPY_WINDOW_MARGIN_MS).toISOString();

/** A transfer's identity across re-indexes: one transaction moves a token at most once. */
export const transferKey = (t: { hash: string; tokenId: string }) => `${t.hash}:${t.tokenId}`;

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
  objektId: transfer.tokenId,
  at: transfer.timestamp,
});

/**
 * Decides each leg from the transfers. `used` holds the `transferKey`s already recorded on a
 * leg, so one transfer verifies at most one leg anywhere. Specific legs go first: their
 * token can only ever satisfy them, while any-copy legs can take another token. Among the
 * rest, the trade accepted first takes a transfer.
 */
export function matchLegs(
  legs: MatchLeg[],
  transfers: MatchTransfer[],
  used: ReadonlySet<string> = new Set(),
): Matched {
  const taken = new Set(used);
  const sorted = transfers
    .map((t) => Object.assign({}, t, { from: t.from.toLowerCase(), to: t.to.toLowerCase() }))
    .toSorted(byTime);
  const results = new Map<number, LegResult>();
  const ordered = legs.toSorted(
    (a, b) =>
      Number(a.objektId === null) - Number(b.objektId === null) ||
      time(a.acceptedAt) - time(b.acceptedAt) ||
      a.id - b.id,
  );

  for (const leg of ordered) {
    const giver = lower(leg.giver);
    const receiver = lower(leg.receiver);
    const start = time(leg.objektId === null ? leg.copyWindowStart : leg.windowStart);
    const accepted = time(leg.acceptedAt);
    const inWindow = (t: MatchTransfer) => time(t.timestamp) >= start && !taken.has(transferKey(t));

    if (leg.objektId !== null) {
      let result: LegResult = { kind: "pending" };
      // the move that took the token from the giver before the accept, while it stays away
      let away: MatchTransfer | null = null;
      for (const t of sorted) {
        if (t.objektId !== leg.objektId || !inWindow(t)) continue;
        if (giver.has(t.to)) {
          away = null;
          continue;
        }
        if (giver.has(t.from) && receiver.has(t.to)) {
          result = verified(t);
          break;
        }
        if (time(t.timestamp) < accepted) {
          if (giver.has(t.from)) away = t;
          continue;
        }
        result = { kind: "broken", transferId: (away ?? t).id };
        break;
      }
      if (result.kind === "pending" && away) result = { kind: "broken", transferId: away.id };
      if (result.kind === "verified") {
        taken.add(transferKey({ hash: result.txHash, tokenId: result.objektId }));
      }
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
    if (match) taken.add(transferKey(match));
    results.set(leg.id, match ? verified(match) : { kind: "pending" });
  }
  return { results, taken };
}

type Matched = { results: Map<number, LegResult>; taken: ReadonlySet<string> };

/** Another copy of a waiting specific leg's collection, sent by its giver to its receiver. */
export type NearMiss = { legId: number; txHash: string; objektId: string; at: string };

/**
 * The wrong copies for the specific legs `matchLegs` left pending, counted as any-copy legs
 * count. A transfer it took verifies a leg, so it's never one; one transfer may still be a
 * near miss for several legs, which their receivers decide one at a time.
 */
export function nearMisses(
  legs: MatchLeg[],
  transfers: MatchTransfer[],
  { results, taken }: Matched,
): NearMiss[] {
  const misses: NearMiss[] = [];
  for (const leg of legs) {
    if (leg.objektId === null || results.get(leg.id)?.kind !== "pending") continue;
    const giver = lower(leg.giver);
    const receiver = lower(leg.receiver);
    const start = time(leg.copyWindowStart);
    const seen = new Set<string>();
    for (const t of transfers) {
      const key = transferKey(t);
      if (
        t.collectionId !== leg.collectionId ||
        t.tokenId === leg.objektId ||
        time(t.timestamp) < start ||
        taken.has(key) ||
        seen.has(key) ||
        !giver.has(t.from.toLowerCase()) ||
        !receiver.has(t.to.toLowerCase())
      ) {
        continue;
      }
      seen.add(key);
      misses.push({ legId: leg.id, txHash: t.hash, objektId: t.tokenId, at: t.timestamp });
    }
  }
  return misses;
}

function lower(addresses: ReadonlySet<string>) {
  return new Set([...addresses].map((address) => address.toLowerCase()));
}

type TradeOutcome =
  | { status: "in_progress" }
  | { status: "completed" }
  | { status: "cancelled"; reason: "token_moved" }
  | { status: "failed" };

/**
 * A trade's state after a run. `alreadyVerified` counts legs verified by earlier runs;
 * `results` cover the legs still open. A wrong copy the receiver holds (`heldCopies`) counts
 * as a transfer made, so a break after one fails the trade.
 */
export function tradeOutcome(
  results: LegResult[],
  alreadyVerified: number,
  heldCopies: number,
): TradeOutcome {
  const verifiedNow = results.filter((r) => r.kind === "verified").length;
  if (results.some((r) => r.kind === "broken")) {
    return alreadyVerified + verifiedNow + heldCopies > 0
      ? { status: "failed" }
      : { status: "cancelled", reason: "token_moved" };
  }
  return results.every((r) => r.kind === "verified")
    ? { status: "completed" }
    : { status: "in_progress" };
}

/**
 * A trade past `TRADE_EXPIRE_DAYS` ends as a broken one does: failed once a leg verified, else
 * cancelled. A wrong copy the receiver holds and hasn't accepted counts as a transfer made.
 */
export function expiredOutcome(verifiedLegs: number, heldCopies: number) {
  return verifiedLegs > 0 || heldCopies > 0 ? ("failed" as const) : ("cancelled" as const);
}

type WatchSet = { objekts: ReadonlySet<string>; collections: ReadonlySet<string> };

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
