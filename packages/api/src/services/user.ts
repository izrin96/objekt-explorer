import { fetchUserProfiles } from "@repo/lib/server/user";

import type { CurrentUser } from "../schemas/current-user";
import { getSession } from "./auth";
import { fetchOwnedLists } from "./list";

export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) return null;

  const [lists, profiles] = await Promise.all([
    fetchOwnedLists("userId", session.user.id),
    fetchUserProfiles(session.user.id),
  ]);

  return {
    user: session.user,
    lists,
    profiles,
  };
}
