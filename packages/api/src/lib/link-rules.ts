export const COOLDOWN_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type LinkHolder = { userId: string; sanctioned: boolean };
type LastLeave = { userId: string; at: Date };

/** Restricted outranks the cooldown: it lasts longer and says more. */
export function linkRefusal({
  callerId,
  holders,
  lastLeave,
  now,
}: {
  callerId: string;
  holders: LinkHolder[];
  lastLeave: LastLeave | null;
  now: Date;
}):
  | { reason: "cosmo_link_address_restricted" }
  | { reason: "cosmo_link_cooldown"; retryAt: Date }
  | null {
  if (holders.some((holder) => holder.sanctioned)) {
    return { reason: "cosmo_link_address_restricted" };
  }
  if (lastLeave && lastLeave.userId !== callerId) {
    const retryAt = new Date(lastLeave.at.getTime() + COOLDOWN_DAYS * DAY_MS);
    if (now < retryAt) return { reason: "cosmo_link_cooldown", retryAt };
  }
  return null;
}

export function unlinkRefusal({
  sanctioned,
  inOpenTrade,
}: {
  sanctioned: boolean;
  inOpenTrade: boolean;
}) {
  if (sanctioned) return "cosmo_link_unlink_sanctioned";
  if (inOpenTrade) return "cosmo_link_unlink_in_trade";
  return null;
}

/** A staff unlink leaves `toId` out, so `same_account` never applies to it. */
export function moveRefusal({
  fromId,
  toId,
  holderNow,
  sanctionedEither,
  inOpenTrade,
}: {
  fromId: string;
  toId?: string;
  holderNow: string | null;
  sanctionedEither: boolean;
  inOpenTrade: boolean;
}) {
  if (toId !== undefined && toId === fromId) return "same_account";
  if (holderNow !== fromId) return "address_changed";
  if (sanctionedEither) return "address_sanctioned";
  if (inOpenTrade) return "address_in_trade";
  return null;
}
