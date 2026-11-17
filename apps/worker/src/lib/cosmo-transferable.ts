// The pure judgement of a Cosmo `transferable` read against the indexer's row (design Decision
// 6): no database or Cosmo access, so it can be tested on its own.

import { Addresses } from "@repo/lib";

type Time = Date | string;

/** What the indexer holds of the token, plus whether a newer or unapplied chain change exists. */
export type TransferableObjekt = {
  transferable: boolean;
  owner: string;
  receivedAt: Time;
  slug: string;
  newerChange: boolean;
} | null;

/**
 * The `cosmo_objekt` fields the judgement reads. `receivedAt` is the indexer's `received_at` when
 * the read was recorded, null when the indexer lacked the token then.
 */
export type TransferableRead = {
  tokenId: string;
  slug: string;
  transferable: boolean;
  nonTransferableReason: string | null;
  observedAt: Time;
  receivedAt: Time | null;
  chainHeight: number;
};

/**
 * The non-transferable reasons an `untransferable` write trusts: the ones seen on production.
 * Any other reason, none or `"other"` is reported, never written. `EXTRA_UNTRANSFERABLE_REASONS`
 * is where the owner adds a reason after reading the plan script's list.
 */
export const KNOWN_UNTRANSFERABLE_REASONS = ["challenge-reward", "welcome-objekt"] as const;
export const EXTRA_UNTRANSFERABLE_REASONS: readonly string[] = [];
const writableReasons = new Set<string>([
  ...KNOWN_UNTRANSFERABLE_REASONS,
  ...EXTRA_UNTRANSFERABLE_REASONS,
]);

export type TransferableMode = { untransferable: boolean; transferable: boolean };

export type JudgedOutcome =
  | "missing"
  | "moved"
  | "chain_newer"
  | "spin"
  | "matched"
  | "report_untransferable"
  | "report_transferable"
  | "write_untransferable"
  | "write_transferable";

/** The outcomes stored on `cosmo_objekt.transferable_outcome`. */
export type StoredOutcome =
  | Exclude<JudgedOutcome, "write_untransferable" | "write_transferable">
  | "written_untransferable"
  | "written_transferable"
  | "raced";

const time = (t: Time) => new Date(t).getTime();

/**
 * One outcome, guards before values, so `matched` means the read passed every guard. A read the
 * indexer lacked at record time is `missing`: its holder was never checked against the chain. A
 * `received_at` other than the recorded one is `moved`, since the holder Cosmo answered for may
 * be gone. A `write_*` is a plan: the caller turns it into `written_*` or `raced` once the guarded
 * UPDATE has run.
 */
export function judgeTransferable(
  objekt: TransferableObjekt,
  read: TransferableRead,
  mode: TransferableMode,
): JudgedOutcome {
  if (!objekt || objekt.slug !== read.slug || read.receivedAt === null) return "missing";
  if (time(objekt.receivedAt) !== time(read.receivedAt)) return "moved";
  if (objekt.newerChange) return "chain_newer";
  if (objekt.owner.toLowerCase() === Addresses.SPIN.toLowerCase()) return "spin";
  if (objekt.transferable === read.transferable) return "matched";
  if (read.transferable) return mode.transferable ? "write_transferable" : "report_transferable";
  const trusted =
    read.nonTransferableReason !== null && writableReasons.has(read.nonTransferableReason);
  return mode.untransferable && trusted ? "write_untransferable" : "report_untransferable";
}

/**
 * The most writes one run may make: 200, or 20% of the reads it judged with a floor of 50,
 * whichever is lower. The owner's 182 objekts all matched, so a run planning more points at a
 * Cosmo-side change or a parse error rather than real corrections; 200 bounds the damage of one
 * 5-minute run, and the floor lets a newly connected account's few corrections through.
 */
export const BREAKER_CAP = 200;
export const BREAKER_SHARE = 0.2;
export const BREAKER_FLOOR = 50;

/** Whether a run planning `planned` writes over `judged` reads writes nothing at all. */
export function transferableBreaker(planned: number, judged: number) {
  const limit = Math.min(BREAKER_CAP, Math.max(BREAKER_FLOOR, Math.floor(judged * BREAKER_SHARE)));
  return { tripped: planned > limit, limit };
}

/** A judged outcome as stored, once the guarded UPDATE has run: a planned write that it did not return raced. */
export function settleOutcome(judged: JudgedOutcome, landed: boolean): StoredOutcome {
  if (judged === "write_untransferable") return landed ? "written_untransferable" : "raced";
  if (judged === "write_transferable") return landed ? "written_transferable" : "raced";
  return judged;
}

/**
 * The `cosmo_transferable` row to store: for `matched` and `written_*` only, since a record holds
 * only a value the worker wrote to, or found in, `objekt.transferable` under every guard.
 */
export function confirmationOf(
  outcome: StoredOutcome,
  read: TransferableRead,
  objekt: NonNullable<TransferableObjekt>,
) {
  if (outcome !== "matched" && !outcome.startsWith("written_")) return null;
  return {
    tokenId: read.tokenId,
    transferable: read.transferable,
    observedAt: read.observedAt,
    chainHeight: read.chainHeight,
    receivedAt: objekt.receivedAt,
  };
}

export function outcomeCounts(outcomes: readonly string[]) {
  const counts: Record<string, number> = {};
  for (const o of outcomes) counts[o] = (counts[o] ?? 0) + 1;
  return counts;
}
