/**
 * Short form of a wallet address, `0x3356…b7de`. One copy: the profile header,
 * the linked-Cosmo card, the drawer timeline and ⌘K search all show the same
 * shape, and four local copies had already drifted apart on where they lived.
 */
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
