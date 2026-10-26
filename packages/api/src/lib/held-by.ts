import { realNickname, truncateAddress } from "@repo/lib/address";

export type HeldBy = { address: string; name: string };

/**
 * Which of the viewer's profiles holds each objekt, by objekt id. Empty for fewer than two
 * profiles, since one profile needs no split; an objekt on none of them is left out.
 */
export function heldByProfile(
  owners: ReadonlyMap<string, string>,
  profiles: readonly { address: string; nickname: string | null }[],
) {
  const held = new Map<string, HeldBy>();
  if (profiles.length < 2) return held;
  const byAddress = new Map(
    profiles.map((profile) => {
      const address = profile.address.toLowerCase();
      const name = realNickname(address, profile.nickname) ?? truncateAddress(address);
      return [address, { address, name }];
    }),
  );
  for (const [id, owner] of owners) {
    const profile = byAddress.get(owner.toLowerCase());
    if (profile) held.set(id, profile);
  }
  return held;
}
