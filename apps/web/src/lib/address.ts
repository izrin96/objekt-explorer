import { truncateAddress } from "@repo/lib/address";

/**
 * The only address equality: a stored address is lowercased while a Cosmo
 * profile carries its checksummed form, so `===` between the two never holds.
 */
export function isSameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  return a != null && b != null && a.toLowerCase() === b.toLowerCase();
}

/**
 * Cosmo stores an unnamed profile's nickname as its own address, which is not
 * a name: it renders as the truncated address the rest of the page shows.
 */
export function displayNickname(address: string, nickname?: string | null): string {
  if (!nickname || isSameAddress(nickname, address)) return truncateAddress(address);
  return nickname;
}

/** the `$nickname` route param: a profile's nickname, or its address when it has none */
export function nicknameParam(address: string, nickname?: string | null): string {
  return nickname || address.toLowerCase();
}
