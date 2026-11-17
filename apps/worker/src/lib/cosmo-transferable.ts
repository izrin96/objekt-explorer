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

/** The `cosmo_objekt` fields the judgement reads. */
export type TransferableRead = {
  tokenId: string;
  slug: string;
  transferable: boolean;
  observedAt: Time;
  chainHeight: number;
};

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
 * One outcome, guards before values, so `matched` means the read passed every guard. A `write_*`
 * is a plan: the caller turns it into `written_*` or `raced` once the guarded UPDATE has run.
 */
export function judgeTransferable(
  objekt: TransferableObjekt,
  read: TransferableRead,
  mode: TransferableMode,
): JudgedOutcome {
  if (!objekt || objekt.slug !== read.slug) return "missing";
  if (time(objekt.receivedAt) > time(read.observedAt)) return "moved";
  if (objekt.newerChange) return "chain_newer";
  if (objekt.owner.toLowerCase() === Addresses.SPIN.toLowerCase()) return "spin";
  if (objekt.transferable === read.transferable) return "matched";
  if (read.transferable) return mode.transferable ? "write_transferable" : "report_transferable";
  return mode.untransferable ? "write_untransferable" : "report_untransferable";
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
