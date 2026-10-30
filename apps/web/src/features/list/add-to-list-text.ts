import type { AddSource } from "@repo/api/schemas/list";
import { truncateAddress } from "@repo/lib/address";

import { isObjektOwned } from "@/features/objekt/objekt-utils";
import { isSameAddress } from "@/lib/address";
import { m } from "@/paraglide/messages";

import type { AddTarget } from "./add-to-list-source";

export function profileLabel(
  profiles: readonly { address: string; nickname?: string | null }[],
  address: string,
) {
  const nickname = profiles.find((p) => isSameAddress(p.address, address))?.nickname;
  // an unnamed profile's nickname is its own address
  return nickname && !isSameAddress(nickname, address) ? `@${nickname}` : truncateAddress(address);
}

/** `profile` is the bound profile's label, or null when the list is unbound */
export function addHint(a: {
  target: AddTarget;
  profile: string | null;
  here: boolean;
  picking: boolean;
  source: { from: AddSource } | null;
}) {
  const { target, profile, here, picking, source } = a;
  if (profile === null) return null;
  // another profile's tokens, or collections: the list's profile adds its own copies
  if (!here) {
    return target.objekts.some(isObjektOwned)
      ? m.list_add_own_copies({ profile })
      : m.list_add_every_copy({ profile });
  }
  if (picking) {
    return target.combined === true && target.copiesPartial === true
      ? m.list_add_copies_partial()
      : m.list_add_copies_hint();
  }
  // a combined card whose copies are not all known goes as its collection
  return source?.from.type === "collections" ? m.list_add_every_copy({ profile }) : null;
}
