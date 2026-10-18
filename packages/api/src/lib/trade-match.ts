import { COPY_REMIND_HOURS } from "../schemas/offer";
import { HOUR_MS } from "./time";

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

export const addressSet = (snapshot: string[], current: string[]) =>
  new Set([...snapshot, ...current].map((address) => address.toLowerCase()));

/** The addresses a transfer may come from to verify this leg, lowercased. */
export const giversOf = (leg: { from_addresses: string[]; from_current: string[] }) =>
  addressSet(leg.from_addresses, leg.from_current);

export type CopyRead = { collectionId: string; givers: string[]; since: string };

/**
 * The copy reads the open legs need, each from its own leg's copy window, so one old trade
 * doesn't widen every read. Legs with the same collection and givers share one read.
 */
export function copyReads(legs: MatchLeg[]): CopyRead[] {
  const reads = new Map<string, CopyRead>();
  for (const leg of legs) {
    const givers = [...leg.giver].toSorted();
    if (leg.collectionId === null || givers.length === 0) continue;
    const key = `${leg.collectionId}|${givers.join(",")}`;
    const seen = reads.get(key);
    if (seen === undefined || Date.parse(leg.copyWindowStart) < Date.parse(seen.since)) {
      reads.set(key, { collectionId: leg.collectionId, givers, since: leg.copyWindowStart });
    }
  }
  return [...reads.values()];
}

/** A transfer's identity across re-indexes: one transaction moves a token at most once. */
export const transferKey = (t: { hash: string; tokenId: string }) => `${t.hash}:${t.tokenId}`;

export type LegResult =
  | { kind: "verified"; transferId: string; txHash: string; objektId: string; at: string }
  /** `at` is when the objekt left */
  | { kind: "broken"; transferId: string; at: string }
  | { kind: "pending" }
  /** pending, while the indexer reads its objekt as non-transferable */
  | { kind: "stuck" };

const time = (at: string) => new Date(at).getTime();

function byTime(a: MatchTransfer, b: MatchTransfer) {
  return time(a.timestamp) - time(b.timestamp) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

const broken = (transfer: MatchTransfer): LegResult => ({
  kind: "broken",
  transferId: transfer.id,
  at: transfer.timestamp,
});

const verified = (transfer: MatchTransfer): LegResult => ({
  kind: "verified",
  transferId: transfer.id,
  txHash: transfer.hash,
  objektId: transfer.tokenId,
  at: transfer.timestamp,
});

/**
 * Whether the token sent early by `sorted[i]` came back to the giver before the accept,
 * following it hop by hop from the receiver: each later move counts only if it leaves the
 * address that holds it then. A move between the receiver's own wallets, or on to someone else,
 * leaves the send counted; moves elsewhere in the same block can't reorder the chain.
 */
function backWithGiver(
  sorted: MatchTransfer[],
  i: number,
  giver: ReadonlySet<string>,
  accepted: number,
) {
  const sent = sorted[i]!;
  if (time(sent.timestamp) >= accepted) return false;
  let holder = sent.to;
  for (const t of sorted.slice(i + 1)) {
    if (time(t.timestamp) >= accepted) break;
    if (t.objektId !== sent.objektId || t.from !== holder) continue;
    holder = t.to;
    if (giver.has(holder)) return true;
  }
  return false;
}

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
      for (const [i, t] of sorted.entries()) {
        if (t.objektId !== leg.objektId || !inWindow(t)) continue;
        if (giver.has(t.to)) {
          away = null;
          continue;
        }
        if (giver.has(t.from) && receiver.has(t.to)) {
          // an early send the giver had back by the accept is not a delivery
          if (!backWithGiver(sorted, i, giver, accepted)) {
            result = verified(t);
            break;
          }
          continue;
        }
        if (time(t.timestamp) < accepted) {
          if (giver.has(t.from)) away = t;
          continue;
        }
        result = broken(away ?? t);
        break;
      }
      if (result.kind === "pending" && away) result = broken(away);
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
 * The wrong copies for the specific legs `matchLegs` left pending or broken, counted as any-copy
 * legs count. A broken leg's copy counts only if it came before the break, so the trade fails
 * rather than cancels. A transfer it took verifies a leg, so it's never one; one transfer may
 * still be a near miss for several legs, which their receivers decide one at a time.
 */
export function nearMisses(
  legs: MatchLeg[],
  transfers: MatchTransfer[],
  { results, taken }: Matched,
): NearMiss[] {
  const misses: NearMiss[] = [];
  for (const leg of legs) {
    const result = results.get(leg.id);
    if (leg.objektId === null || (result?.kind !== "pending" && result?.kind !== "broken")) {
      continue;
    }
    const giver = lower(leg.giver);
    const receiver = lower(leg.receiver);
    const start = time(leg.copyWindowStart);
    const end = result.kind === "broken" ? time(result.at) : Infinity;
    const seen = new Set<string>();
    for (const t of transfers) {
      const key = transferKey(t);
      if (
        t.collectionId !== leg.collectionId ||
        t.tokenId === leg.objektId ||
        time(t.timestamp) < start ||
        time(t.timestamp) >= end ||
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
  | { status: "cancelled"; reason: "token_moved" | "not_transferable" }
  | { status: "failed" };

/**
 * A trade's state after a run. `alreadyVerified` counts legs verified by earlier runs;
 * `results` cover the legs still open. A wrong copy the receiver holds (`heldCopies`) counts
 * as a transfer made, so a break after one fails the trade. A stuck leg cancels the trade only
 * while nothing was sent; after that the trade waits, and expires as any other.
 */
export function tradeOutcome(
  results: LegResult[],
  alreadyVerified: number,
  heldCopies: number,
): TradeOutcome {
  const verifiedNow = results.filter((r) => r.kind === "verified").length;
  const sent = alreadyVerified + verifiedNow + heldCopies > 0;
  if (results.some((r) => r.kind === "broken")) {
    return sent ? { status: "failed" } : { status: "cancelled", reason: "token_moved" };
  }
  if (!sent && results.some((r) => r.kind === "stuck")) {
    return { status: "cancelled", reason: "not_transferable" };
  }
  return results.every((r) => r.kind === "verified")
    ? { status: "completed" }
    : { status: "in_progress" };
}

/**
 * What a run writes to a specific open leg's `untransferable_at`: `stuck` sets it (and tells
 * both parties) when the indexer first reads the objekt as non-transferable, `clear` drops it
 * once it reads transferable again. An objekt the indexer doesn't know changes nothing.
 */
export function stuckChange(
  transferable: boolean | undefined,
  untransferableAt: string | null,
): "stuck" | "clear" | null {
  if (transferable === false && untransferableAt === null) return "stuck";
  if (transferable === true && untransferableAt !== null) return "clear";
  return null;
}

/**
 * A trade past `TRADE_EXPIRE_DAYS` ends as a broken one does: failed once a leg verified, else
 * cancelled. A wrong copy the receiver holds and hasn't accepted counts as a transfer made.
 */
export function expiredOutcome(verifiedLegs: number, heldCopies: number) {
  return verifiedLegs > 0 || heldCopies > 0 ? ("failed" as const) : ("cancelled" as const);
}

/**
 * A pending wrong copy counts as accepted once the indexer has read past its `acceptBy`, so a
 * right copy sent before the deadline but read late still verifies the leg first.
 */
export function copyDue(acceptBy: string | null, seenUntil: string | null) {
  return acceptBy !== null && seenUntil !== null && time(acceptBy) <= time(seenUntil);
}

/** The receiver's one reminder, `COPY_REMIND_HOURS` before the copy is due, while it isn't yet. */
export function copyReminderDue(
  acceptBy: string | null,
  seenUntil: string | null,
  remindedAt: string | null,
) {
  if (acceptBy === null || seenUntil === null || remindedAt !== null) return false;
  if (copyDue(acceptBy, seenUntil)) return false;
  return time(acceptBy) - COPY_REMIND_HOURS * HOUR_MS <= time(seenUntil);
}

type HeldCopy = { id: number; status: string; at: string };

/**
 * The copy a leg accepts when it must close without its own objekt: the earliest pending one,
 * sent before `before` when given. A declined copy is never accepted. Callers pass only copies
 * whose transfer verified no leg.
 */
export function firstPending<C extends HeldCopy>(copies: C[], before?: string): C | null {
  const limit = before === undefined ? Infinity : time(before);
  return (
    copies
      .filter((copy) => copy.status === "pending" && time(copy.at) < limit)
      .toSorted((a, b) => time(a.at) - time(b.at) || a.id - b.id)[0] ?? null
  );
}

/** A broken leg holding a pending copy sent before the break accepts it instead of breaking. */
export function copyRescue<C extends HeldCopy>(result: LegResult, copies: C[]): C | null {
  return result.kind === "broken" ? firstPending(copies, result.at) : null;
}

type DatedCopy = HeldCopy & { acceptBy: string | null };

/** The copy a leg accepts at its deadline: the earliest pending one, once its own is due. */
export function dueCopy<C extends DatedCopy>(copies: C[], seenUntil: string | null): C | null {
  const first = firstPending(copies);
  return first && copyDue(first.acceptBy, seenUntil) ? first : null;
}

/** The copy whose receiver is reminded: the earliest pending one, as only it can be accepted. */
export function reminderCopy<C extends DatedCopy & { remindedAt: string | null }>(
  copies: C[],
  seenUntil: string | null,
): C | null {
  const first = firstPending(copies);
  return first && copyReminderDue(first.acceptBy, seenUntil, first.remindedAt) ? first : null;
}

/**
 * Whether a settle notes `leg_verified`: an auto-accepted copy carries its own note, so only a
 * leg verified otherwise in the same settle does.
 */
export function legVerifiedNoted(verified: number, autoAccepted: number) {
  return verified > autoAccepted;
}

/**
 * `collections` maps a collection id to the lowercased addresses giving a copy of it: a copy
 * from anyone else can't verify a leg or count as a wrong copy, and busy collections would
 * otherwise wake the verifier on nearly every batch.
 */
type WatchSet = {
  objekts: ReadonlySet<string>;
  collections: ReadonlyMap<string, ReadonlySet<string>>;
};

/** One transfer as the indexer publishes it on `transfers`: Subsquid entities, nested. */
type PublishedTransfer = {
  from?: string | null;
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
    const givers = t?.collection?.id == null ? undefined : watch.collections.get(t.collection.id);
    return (
      (objektId != null && watch.objekts.has(objektId)) ||
      (givers !== undefined && t?.from != null && givers.has(t.from.toLowerCase()))
    );
  });
}
