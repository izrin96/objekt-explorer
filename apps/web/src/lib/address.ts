/**
 * The only address equality: a stored address is lowercased while a Cosmo
 * profile carries its checksummed form, so `===` between the two never holds.
 */
export function isSameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  return a != null && b != null && a.toLowerCase() === b.toLowerCase();
}

/** `0x3356…b7de` */
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Cosmo stores an unnamed profile's nickname as its own address, which is not
 * a name: it renders as the truncated address the rest of the page shows.
 */
export function displayNickname(address: string, nickname?: string | null): string {
  if (!nickname || isSameAddress(nickname, address)) return truncateAddress(address);
  return nickname;
}
