import type { SanctionType } from "../schemas/moderation";
import { TRADE_EXPIRE_DAYS, type TradeStatus } from "../schemas/offer";
import type { DeleteRefusal, DeletionStep } from "../schemas/user";
import { cancelRefusal } from "./offer-rules";
import { DAY_MS } from "./time";

export const FRESH_SIGN_IN_MINUTES = 10;

export type DeletionTrade = {
  id: number;
  partnerId: string;
  status: TradeStatus;
  acceptedAt: Date;
  endedAt: Date | null;
  verifiedLegs: number;
  heldCopies: number;
};

export type DeletionSanction = {
  type: SanctionType;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

export type DeletionBlocker =
  | { kind: "trade"; tradeId: number; partnerId: string; cancelLocked: boolean; endsBy: Date }
  | { kind: "sanction"; type: SanctionType; until: Date | null };

const endOf = (blocker: DeletionBlocker) =>
  blocker.kind === "trade" ? blocker.endsBy : blocker.until;

const KIND_ORDER = { trade: 0, sanction: 1 } as const;

/** The same rule as `activeSanctionWhere`: a warning never blocks. */
const sanctionBlocks = (sanction: DeletionSanction, now: Date) =>
  sanction.type !== "warn" &&
  sanction.revokedAt === null &&
  (sanction.expiresAt === null || sanction.expiresAt.getTime() > now.getTime());

/** What keeps the account from being deleted, the one ending soonest first and open-ended last. */
export function deletionBlockers({
  trades,
  sanctions,
  now,
}: {
  trades: DeletionTrade[];
  sanctions: DeletionSanction[];
  now: Date;
}): DeletionBlocker[] {
  const blockers: DeletionBlocker[] = [
    ...trades
      .filter((trade) => trade.status === "in_progress")
      .map((trade) => ({
        kind: "trade" as const,
        tradeId: trade.id,
        partnerId: trade.partnerId,
        // a lagging indexer only holds cancelling for a moment, so it reads as available
        cancelLocked: cancelRefusal(trade, false, trade.heldCopies) === "locked",
        endsBy: new Date(trade.acceptedAt.getTime() + TRADE_EXPIRE_DAYS * DAY_MS),
      })),
    ...sanctions
      .filter((sanction) => sanctionBlocks(sanction, now))
      .map((sanction) => ({
        kind: "sanction" as const,
        type: sanction.type,
        until: sanction.expiresAt,
      })),
  ];
  return blockers.toSorted((a, b) => {
    const endA = endOf(a)?.getTime() ?? Infinity;
    const endB = endOf(b)?.getTime() ?? Infinity;
    if (endA !== endB) return endA < endB ? -1 : 1;
    if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (a.kind === "trade" && b.kind === "trade") return a.tradeId - b.tradeId;
    return 0;
  });
}

export function refusalOf(blockers: DeletionBlocker[]): DeleteRefusal | null {
  if (blockers.some((blocker) => blocker.kind === "sanction")) return "sanctioned";
  if (blockers.some((blocker) => blocker.kind === "trade")) return "trade_in_progress";
  return null;
}

/**
 * `.invalid` is reserved by RFC 6761: Better Auth's `*.placeholder.invalid` and the scrub's
 * `deleted.invalid`. Discord sign-ups without an email get `*.placeholder.local`.
 */
export function hasDeliverableEmail(email: string) {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  return !(
    domain === "invalid" ||
    domain.endsWith(".invalid") ||
    domain.endsWith(".placeholder.local")
  );
}

export function deletionStep(email: string, sessionCreatedAt: Date, now: Date): DeletionStep {
  if (hasDeliverableEmail(email)) return "send-email";
  const age = now.getTime() - sessionCreatedAt.getTime();
  return age < FRESH_SIGN_IN_MINUTES * 60 * 1000 ? "delete" : "sign-in-again";
}
