/** `0x3356…b7de` */
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Cosmo stores an unnamed profile's nickname as its own address, which is not
 * a name: it renders as the truncated address the rest of the page shows.
 */
export function displayNickname(address: string, nickname?: string | null): string {
  if (!nickname || nickname.toLowerCase() === address.toLowerCase())
    return truncateAddress(address);
  return nickname;
}
