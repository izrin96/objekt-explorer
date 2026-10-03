import { db } from "@repo/db";

import { getSession } from "./auth";

/** a private profile shows only to the account that linked the address */
export function isProfileHidden(
  profile: { privateProfile: boolean; userId: string | null },
  viewerId: string | undefined,
): boolean {
  return profile.privateProfile && (viewerId === undefined || viewerId !== profile.userId);
}

export async function isAddressHiddenFromCaller(
  address: string,
  opts?: { checkHideTransfer?: boolean },
): Promise<boolean> {
  const owner = await db.query.userAddress.findFirst({
    where: { address: address.toLowerCase() },
    columns: { privateProfile: true, hideTransfer: true, userId: true },
  });
  if (!owner) return false;

  const isPrivate = owner.privateProfile || (!!opts?.checkHideTransfer && owner.hideTransfer);
  if (!isPrivate) return false;

  const session = await getSession();
  return isProfileHidden({ privateProfile: isPrivate, userId: owner.userId }, session?.user.id);
}
