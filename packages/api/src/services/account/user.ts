import { db } from "@repo/db";
import { user as userSchema } from "@repo/db/auth-schema";
import { fetchUserProfiles } from "@repo/lib/server/user";
import { eq } from "drizzle-orm";
import type * as z from "zod";

import type {
  CurrentUserOutput,
  offerRulesInputSchema,
  updateAccountInputSchema,
} from "../../schemas/user";
import { fetchOwnedLists } from "../list/read";
import { loadIdentities } from "./identities";
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

export async function updateAccount(
  userId: string,
  input: z.infer<typeof updateAccountInputSchema>,
) {
  await db
    .update(userSchema)
    .set({
      name: input.name,
      showSocial: input.showSocial,
      showOnline: input.showOnline,
      onlyWantedOffers: input.onlyWantedOffers,
      allowCollectionAsks: input.allowCollectionAsks,
      multiPostAsks: input.multiPostAsks,
      image: input.removePic ? null : undefined,
      removeImage: input.removePic,
    })
    .where(eq(userSchema.id, userId));
}

export async function setOfferRules(userId: string, input: z.infer<typeof offerRulesInputSchema>) {
  if (Object.values(input).every((value) => value === undefined)) return;
  await db
    .update(userSchema)
    .set({
      onlyWantedOffers: input.onlyWantedOffers,
      allowCollectionAsks: input.allowCollectionAsks,
      multiPostAsks: input.multiPostAsks,
    })
    .where(eq(userSchema.id, userId));
}
