/** `0x3356…b7de` */
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** A profile's Cosmo nickname, or null: Cosmo stores an unnamed profile's nickname as its own address. */
export function realNickname(address: string, nickname: string | null | undefined) {
  return nickname && nickname.toLowerCase() !== address.toLowerCase() ? nickname : null;
}
