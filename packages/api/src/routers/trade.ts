import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { hiddenTradePartner, lists, user, userAddress } from "@repo/db/schema";
import { bumpTradeVersion } from "@repo/lib/server/list-touch";
import { and, desc, eq, inArray } from "drizzle-orm";

import { authed, optionalAuthed, pub } from "../orpc";
import {
  browseInputSchema,
  bumpInputSchema,
  collectionPostCountsInputSchema,
  forYouInputSchema,
  listMatchCountInputSchema,
  setShowOnTradeInputSchema,
  tradePartnerInputSchema,
} from "../schemas/trade";
import { toPublicUser } from "../services/profile";
import { redis } from "../services/redis";
import {
  browseFeed,
  bumpPost,
  collectionPostCounts,
  fetchMyPosts,
  setShowOnTrade,
} from "../services/trade-feed";
import {
  getTradeMatches,
  resolveTradeSides,
  withMessageable,
  withReputation,
} from "../services/trade-matches";

export const tradeRouter = {
  /** Public; viewer fields are present only with a session. */
  browse: optionalAuthed
    .input(browseInputSchema)
    .handler(async ({ input, context: { session } }) =>
      browseFeed(session?.user.id ?? null, input),
    ),

  bump: authed
    .input(bumpInputSchema)
    .handler(async ({ input: { slug }, context: { session } }) => bumpPost(session.user.id, slug)),

  myPosts: authed.handler(async ({ context: { session } }) => fetchMyPosts(session.user.id)),

  setShowOnTrade: authed
    .input(setShowOnTradeInputSchema)
    .handler(async ({ input: { slug, on }, context: { session } }) =>
      setShowOnTrade(session.user.id, slug, on),
    ),

  collectionPostCounts: pub
    .input(collectionPostCountsInputSchema)
    .handler(async ({ input: { slug } }) => collectionPostCounts(slug)),

  forYou: authed
    .input(forYouInputSchema)
    .handler(async ({ input: { filter, list }, context: { session } }) => {
      const sides = await resolveTradeSides(session.user.id, list);
      return withReputation(
        await withMessageable(await getTradeMatches(session.user.id, sides, filter)),
      );
    }),

  /** The list header's count: that list's Mutual only partners, from the same cache entry For you reads. */
  listMatchCount: authed
    .input(listMatchCountInputSchema)
    .handler(async ({ input: { slug }, context: { session } }) => {
      const sides = await resolveTradeSides(session.user.id, slug);
      if (sides.listId === null) throw new ORPCError("NOT_FOUND");
      const result = await getTradeMatches(session.user.id, sides, "mutual");
      return result.partners.length;
    }),

  /**
   * Only a partner with a list For you or Browse can show is hidden; any other id gets the
   * same empty response, so the call never tells whether an account exists.
   */
  hidePartner: authed
    .input(tradePartnerInputSchema)
    .handler(async ({ input: { userId }, context: { session } }) => {
      if (userId === session.user.id) throw new ORPCError("BAD_REQUEST");
      const tradeLists = await db.$count(
        lists,
        and(
          eq(lists.userId, userId),
          eq(lists.discoverable, true),
          inArray(lists.listTypeNew, ["have", "sale", "want"]),
        ),
      );
      if (tradeLists === 0) return;

      await db
        .insert(hiddenTradePartner)
        .values({ userId: session.user.id, hiddenUserId: userId })
        .onConflictDoNothing();
      await bumpTradeVersion(redis, [session.user.id]);
    }),

  unhidePartner: authed
    .input(tradePartnerInputSchema)
    .handler(async ({ input: { userId }, context: { session } }) => {
      await db
        .delete(hiddenTradePartner)
        .where(
          and(
            eq(hiddenTradePartner.userId, session.user.id),
            eq(hiddenTradePartner.hiddenUserId, userId),
          ),
        );
      await bumpTradeVersion(redis, [session.user.id]);
    }),

  hiddenPartners: authed.handler(async ({ context: { session } }) => {
    const rows = await db
      .select({ user, hiddenAt: hiddenTradePartner.createdAt })
      .from(hiddenTradePartner)
      .innerJoin(user, eq(user.id, hiddenTradePartner.hiddenUserId))
      .where(eq(hiddenTradePartner.userId, session.user.id))
      .orderBy(desc(hiddenTradePartner.createdAt));

    // only addresses a discoverable list is bound to, as For you named the partner
    const addresses =
      rows.length === 0
        ? []
        : await db
            .selectDistinct({
              userId: lists.userId,
              address: userAddress.address,
              nickname: userAddress.nickname,
            })
            .from(lists)
            .innerJoin(userAddress, eq(userAddress.address, lists.profileAddress))
            .where(
              and(
                inArray(
                  lists.userId,
                  rows.map((row) => row.user.id),
                ),
                eq(lists.discoverable, true),
                inArray(lists.listTypeNew, ["have", "sale", "want"]),
                eq(userAddress.userId, lists.userId),
              ),
            );

    return rows.map((row) => ({
      userId: row.user.id,
      user: toPublicUser(row.user),
      profiles: addresses
        .filter((a) => a.userId === row.user.id)
        .map((a) => ({ address: a.address.toLowerCase(), nickname: a.nickname })),
      hiddenAt: row.hiddenAt,
    }));
  }),
};
