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

/**
 * Whether a Cosmo profile proves a pending link. The bio code proves control of the profile, not
 * of the address the client sent, so the profile's own nickname and address must match the claim.
 */
export function verifyRefusal(
  profile: { nickname: string; address: string; statusMessage: string | null },
  claim: { nickname: string; address: string; code: string },
): "cosmo_link_profile_mismatch" | "cosmo_link_code_not_found" | null {
  if (
    profile.nickname.toLowerCase() !== claim.nickname.toLowerCase() ||
    profile.address.toLowerCase() !== claim.address.toLowerCase()
  ) {
    return "cosmo_link_profile_mismatch";
  }
  if (!profile.statusMessage?.toLowerCase().includes(claim.code))
    return "cosmo_link_code_not_found";
  return null;
}
