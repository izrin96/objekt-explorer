import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { hiddenTradePartner, lists, user, userAddress } from "@repo/db/schema";
import { bumpTradeVersion } from "@repo/lib/server/list-touch";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, inArray } from "drizzle-orm";

import { refuse } from "../lib/refuse";
import { authed, optionalAuthed, pub } from "../orpc";
import {
  browseInputSchema,
  peopleInputSchema,
  collectionPostCountsInputSchema,
  forYouInputSchema,
  fullestFilter,
  listMatchCountInputSchema,
  mutualCountInputSchema,
  personInputSchema,
  setShowOnTradeInputSchema,
  tabCountsInputSchema,
  tabCountsOutputSchema,
  tradePartnerInputSchema,
} from "../schemas/trade";
import { toPublicUser } from "../services/profile";
import { ipRateLimited, redis, userRateLimited } from "../services/redis";
import {
  browseFeed,
  bumpPerson,
  collectionPostCounts,
  fetchMyPosts,
  setShowOnTrade,
} from "../services/trade-feed";
import { peopleFeed } from "../services/trade-feed/people";
import {
  getTradeMatches,
  personDetail,
  resolveTradeSides,
  withMessageable,
  withReputation,
} from "../services/trade-matches";
import { mutualCount } from "../services/trade-matches/mutual";
import { tabCounts } from "../services/trade-tabs";

/**
 * A feed page is public and runs several heavy reads, so each viewer gets a budget: by account
 * when signed in, else by IP, more generous since a shared address carries many visitors.
 */
async function limitFeed(userId: string | undefined, headers: Headers | undefined) {
  const limited = userId
    ? await userRateLimited("trade-feed", userId, 60, 60)
    : await ipRateLimited("trade-feed", headers ?? getRequestHeaders(), 120, 60);
  if (limited)
    refuse("TOO_MANY_REQUESTS", "user_rate_limit", "Too many requests, try again shortly");
}

export const tradeRouter = {
  /** Public; viewer fields are present only with a session. */
  browse: optionalAuthed.input(browseInputSchema).handler(async ({ input, context }) => {
    await limitFeed(context.session?.user.id, context.headers);
    return browseFeed(context.session?.user.id ?? null, input);
  }),

  /** Public like `browse`: the feed as people, 12 a page, each with all of their posts. */
  people: optionalAuthed.input(peopleInputSchema).handler(async ({ input, context }) => {
    await limitFeed(context.session?.user.id, context.headers);
    return peopleFeed(context.session?.user.id ?? null, input);
  }),

  bump: authed.handler(async ({ context: { session } }) => bumpPerson(session.user.id)),

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
      const sides = await resolveTradeSides(session.user.id, list, filter);
      return withReputation(
        await withMessageable(await getTradeMatches(session.user.id, sides, filter)),
      );
    }),

  /** One person's matches, for the Browse person sheet. */
  person: authed
    .input(personInputSchema)
    .handler(async ({ input: { userId, list }, context: { session } }) =>
      personDetail(session.user.id, userId, list),
    ),

  /** "Mutual N" on Browse, and the list header's count. */
  mutualCount: authed
    .input(mutualCountInputSchema)
    .handler(async ({ input: { list }, context: { session } }) =>
      mutualCount(session.user.id, list),
    ),

  /** Kept for tabs loaded before the merge; the list header reads `mutualCount`. */
  listMatchCount: authed
    .input(listMatchCountInputSchema)
    .handler(async ({ input: { slug }, context: { session } }) => {
      const sides = await resolveTradeSides(session.user.id, slug, "all");
      if (sides.listId === null) throw new ORPCError("NOT_FOUND");
      const filter = fullestFilter({
        have: sides.haveListIds.length > 0,
        want: sides.wantListIds.length > 0,
      });
      const result = await getTradeMatches(session.user.id, sides, filter);
      return result.partners.length;
    }),

  /**
   * The Trade tab badges: offers to answer plus trades in progress as `mine`. `forYou` is For you's
   * partner count, computed only for tabs loaded before the merge; `forYou: false` returns 0.
   */
  tabCounts: authed
    .input(tabCountsInputSchema)
    .output(tabCountsOutputSchema)
    .handler(async ({ input: { forYou }, context: { session } }) =>
      tabCounts(session.user.id, forYou),
    ),

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
