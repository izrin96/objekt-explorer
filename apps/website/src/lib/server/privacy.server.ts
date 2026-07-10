import { db } from "@repo/db";
import { fetchUserProfiles } from "@repo/lib/server/user";

import { getSession } from "./auth.server";

export async function isAddressHiddenFromCaller(address: string): Promise<boolean> {
  const addr = address.toLowerCase();
  const owner = await db.query.userAddress.findFirst({
    where: { address: addr },
    columns: { privateProfile: true },
    orderBy: { id: "desc" },
  });
  const isPrivate = owner?.privateProfile ?? false;
  if (!isPrivate) return false;

  const session = await getSession();
  if (!session) return true;

  const profiles = await fetchUserProfiles(session.user.id);
  return !profiles.some((a) => a.address.toLowerCase() === addr);
}
