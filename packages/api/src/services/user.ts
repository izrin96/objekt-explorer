import { fetchUserProfiles } from "@repo/lib/server/user";

import type { CurrentUserOutput } from "../schemas/user";
import { loadIdentities } from "./identities";
import { fetchOwnedLists } from "./list";
import { getSession } from "./session";

export async function getCurrentUser(): Promise<CurrentUserOutput> {
  const session = await getSession();
  if (!session) return null;

  const [lists, profiles, identities] = await Promise.all([
    fetchOwnedLists("userId", session.user.id),
    fetchUserProfiles(session.user.id),
    loadIdentities([session.user.id]),
  ]);

  return {
    user: session.user,
    lists,
    profiles,
    defaultAddress: identities.get(session.user.id)?.identity.address ?? null,
  };
}
