import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { hiddenTradePartner, lists, user, userAddress } from "@repo/db/schema";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, inArray } from "drizzle-orm";

import { refuse } from "../lib/refuse";
import { authed, optionalAuthed, pub } from "../orpc";
import { documented, errorResponses, type OperationObject } from "../schemas/common/documented";
import {
  peopleInputSchema,
  peopleOutputSchema,
  collectionPostCountsInputSchema,
  collectionPostCountsOutputSchema,
  listMatchesInputSchema,
  mutualCountInputSchema,
  personInputSchema,
  savePostInputSchema,
  sideItemsInputSchema,
  sideItemsOutputSchema,
  tabCountsOutputSchema,
  takeDownPostInputSchema,
  tradePartnerInputSchema,
} from "../schemas/trade";
import { toPublicUser } from "../services/profile";
import { ipRateLimited, refuseOverUserLimit, userRateLimited } from "../services/redis";
import { bumpTradeVersions } from "../services/safety-cache";
import {
  bumpPerson,
  collectionPostCounts,
  fetchListMatches,
  fetchMyPosts,
  fetchSideItems,
} from "../services/trade-feed";
import { peopleFeed } from "../services/trade-feed/people";
import { personDetail } from "../services/trade-matches";
import { mutualCount } from "../services/trade-matches/mutual";
import { savePost, takeDownPost } from "../services/trade-post";
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

/** The document names `cursor` as the JSON text `/api/v1` sends, not the object `/rpc` does. */
function jsonCursorParam(operation: OperationObject): OperationObject {
  return {
    ...operation,
    parameters: operation.parameters?.map((param) =>
      "name" in param && param.name === "cursor"
        ? {
            ...param,
            description: "The previous page's `nextCursor`, JSON-encoded",
            schema: { type: "string" },
            style: undefined,
            explode: undefined,
          }
        : param,
    ),
  };
}

// a sale list's save moves the market version, which every viewer's trade caches read
const limitPostWrites = (userId: string) => refuseOverUserLimit("trade-post", userId, 60, 3600);

export const tradeRouter = {
  /** Public: the feed as people, 12 a page, each with all of their posts. */
  people: optionalAuthed
    .route({
      method: "GET",
      path: "/trade/people",
      tags: ["Trade"],
      summary: "The Trade feed by person, 12 a page, each with their posts",
      description: "Match fields are filled only for a signed-in viewer.",
      spec: (operation) => jsonCursorParam(errorResponses(400, 429)(operation)),
    })
    .input(peopleInputSchema)
    .output(documented(peopleOutputSchema))
    .handler(async ({ input, context }) => {
      await limitFeed(context.session?.user.id, context.headers);
      return peopleFeed(context.session?.user.id ?? null, input);
    }),

  /** Public like `people`: every objekt of one post side, for its "+N" dialog. */
  sideItems: optionalAuthed
    .route({
      method: "GET",
      path: "/trade/lists/{listId}/items",
      tags: ["Trade"],
      summary: "Every objekt of one post side, copies stacked",
      spec: errorResponses(400, 404, 429),
    })
    .input(sideItemsInputSchema)
    .output(documented(sideItemsOutputSchema))
    .handler(async ({ input, context }) => {
      await limitFeed(context.session?.user.id, context.headers);
      return fetchSideItems(context.session?.user.id ?? null, input);
    }),

  /** A list page's Show my matches: which of the list's collections match the viewer's lists. */
  listMatches: authed
    .input(listMatchesInputSchema)
    .handler(async ({ input: { listId }, context }) => {
      await limitFeed(context.session.user.id, context.headers);
      return fetchListMatches(context.session.user.id, listId);
    }),

  bump: authed.handler(async ({ context: { session } }) => bumpPerson(session.user.id)),

  myPosts: authed.handler(async ({ context: { session } }) => fetchMyPosts(session.user.id)),

  /** Creates or edits a post: its lists, their link, the want list's Open to and Trade state, at once. */
  savePost: authed.input(savePostInputSchema).handler(async ({ input, context: { session } }) => {
    await limitPostWrites(session.user.id);
    return savePost(session.user.id, input);
  }),

  takeDownPost: authed
    .input(takeDownPostInputSchema)
    .handler(async ({ input: { slug }, context: { session } }) => {
      await limitPostWrites(session.user.id);
      return takeDownPost(session.user.id, slug);
    }),

  collectionPostCounts: pub
    .route({
      method: "GET",
      path: "/trade/collections/{slug}/post-counts",
      tags: ["Trade"],
      summary: "How many Trade posts offer and want one collection",
      spec: errorResponses(400),
    })
    .input(collectionPostCountsInputSchema)
    .output(documented(collectionPostCountsOutputSchema))
    .handler(async ({ input: { slug } }) => collectionPostCounts(slug)),

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

  /** The Trade tab badge: offers to answer plus trades in progress. */
  tabCounts: authed
    .output(tabCountsOutputSchema)
    .handler(async ({ context: { session } }) => tabCounts(session.user.id)),

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
          inArray(lists.listType, ["have", "sale", "want"]),
        ),
      );
      if (tradeLists === 0) return;

      await db
        .insert(hiddenTradePartner)
        .values({ userId: session.user.id, hiddenUserId: userId })
        .onConflictDoNothing();
      await bumpTradeVersions([session.user.id]);
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
      await bumpTradeVersions([session.user.id]);
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
                inArray(lists.listType, ["have", "sale", "want"]),
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
