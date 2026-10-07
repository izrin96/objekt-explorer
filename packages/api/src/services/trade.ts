import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { type List, listEntries, lists, user, userAddress } from "@repo/db/schema";
import { overrideCollection } from "@repo/lib/server/objekt";
import { and, countDistinct, desc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getCollectionColumns } from "./objekt";
import { toPublicUser } from "./profile";

type TradeMode = "have-to-want" | "want-to-have" | "both";

const PARTNER_LIMIT = 50;

/**
 * Lists whose entries overlap the given have or want list. A single
 * direction matches the opposite list type; `both` needs a linked have+want
 * pair on each side and matches in both directions.
 */
export async function findTradePartners(list: List, mode: TradeMode | undefined, userId: string) {
  if (list.listTypeNew !== "have" && list.listTypeNew !== "want") {
    throw new ORPCError("BAD_REQUEST", {
      message: "List must be a have or want list",
    });
  }

  // defaults to the natural direction for the list type
  const effectiveMode = mode ?? (list.listTypeNew === "have" ? "have-to-want" : "want-to-have");

  if (effectiveMode === "both" && !list.linkedListId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Both mode requires a paired have+want list",
    });
  }
  if (effectiveMode === "have-to-want" && list.listTypeNew !== "have") {
    throw new ORPCError("BAD_REQUEST", {
      message: "'have-to-want' mode requires the slug to be a have list",
    });
  }
  if (effectiveMode === "want-to-have" && list.listTypeNew !== "want") {
    throw new ORPCError("BAD_REQUEST", {
      message: "'want-to-have' mode requires the slug to be a want list",
    });
  }

  if (effectiveMode === "both") {
    const partners = await fetchPairedPartners(
      list.listTypeNew,
      list.id,
      list.linkedListId!,
      userId,
    );
    return buildTradePartnersResponse(partners, "theyHaveIWant");
  }

  const partners = await fetchSingleDirectionPartners(list.listTypeNew, list.id, userId);
  return buildTradePartnersResponse(
    partners,
    list.listTypeNew === "want" ? "theyHaveIWant" : "iHaveTheyWant",
  );
}

/** discoverable lists of the opposite type that share a collection with mine */
async function fetchSingleDirectionPartners(
  anchorType: "have" | "want",
  anchorListId: number,
  userId: string,
): Promise<PartnerRow[]> {
  const partnerType = anchorType === "want" ? "have" : "want";

  const myCollections = db.$with("my_collections").as(
    db
      .select({ collectionSlug: listEntries.collectionSlug })
      .from(listEntries)
      .where(and(eq(listEntries.listId, anchorListId), isNotNull(listEntries.collectionSlug))),
  );

  const partnerLists = db.$with(`active_${partnerType}s`).as(
    db
      .select({
        listId: lists.id,
        listSlug: lists.slug,
        listName: lists.name,
        userId: lists.userId,
        profileAddress: lists.profileAddress,
        profileSlug: lists.profileSlug,
      })
      .from(lists)
      .where(and(eq(lists.listTypeNew, partnerType), eq(lists.discoverable, true))),
  );

  const rows = await db
    .with(myCollections, partnerLists)
    .select({
      userId: partnerLists.userId,
      listId: partnerLists.listId,
      listSlug: partnerLists.listSlug,
      listName: partnerLists.listName,
      profileAddress: partnerLists.profileAddress,
      profileSlug: partnerLists.profileSlug,
      matched: sql<string[]>`array_agg(DISTINCT ${listEntries.collectionSlug})`,
    })
    .from(listEntries)
    .innerJoin(partnerLists, eq(partnerLists.listId, listEntries.listId))
    .innerJoin(myCollections, eq(myCollections.collectionSlug, listEntries.collectionSlug))
    .where(ne(partnerLists.userId, userId))
    .groupBy(
      partnerLists.userId,
      partnerLists.listId,
      partnerLists.listSlug,
      partnerLists.listName,
      partnerLists.profileAddress,
      partnerLists.profileSlug,
    )
    .orderBy(desc(countDistinct(listEntries.collectionSlug)))
    .limit(PARTNER_LIMIT);

  return rows.map((r) => ({
    userId: r.userId,
    listId: r.listId,
    listSlug: r.listSlug,
    listName: r.listName,
    profileAddress: r.profileAddress,
    profileSlug: r.profileSlug,
    theyHaveIWant: partnerType === "have" ? r.matched : [],
    iHaveTheyWant: partnerType === "want" ? r.matched : [],
  }));
}

/**
 * Partners whose linked have+want pair matches mine both ways: their have list
 * shares a collection with my want list, and their want list with my have list.
 * The partner list reported is the one matching my anchor list.
 */
async function fetchPairedPartners(
  anchorType: "have" | "want",
  anchorListId: number,
  pairedListId: number,
  userId: string,
): Promise<PartnerRow[]> {
  const myWantListId = anchorType === "want" ? anchorListId : pairedListId;
  const myHaveListId = anchorType === "want" ? pairedListId : anchorListId;

  const tradeActiveHaves = db.$with("trade_active_haves").as(
    db
      .select({
        listId: lists.id,
        listSlug: lists.slug,
        listName: lists.name,
        userId: lists.userId,
        wantListId: lists.linkedListId,
        profileAddress: lists.profileAddress,
        profileSlug: lists.profileSlug,
      })
      .from(lists)
      .where(
        and(
          eq(lists.listTypeNew, "have"),
          isNotNull(lists.linkedListId),
          eq(lists.discoverable, true),
        ),
      ),
  );

  const w = alias(lists, "w");
  const h = alias(lists, "h");

  const tradeActiveWants = db.$with("trade_active_wants").as(
    db
      .select({
        listId: w.id,
        listSlug: w.slug,
        listName: w.name,
        userId: w.userId,
        profileAddress: w.profileAddress,
        profileSlug: w.profileSlug,
      })
      .from(w)
      .innerJoin(h, eq(h.linkedListId, w.id))
      .where(and(eq(w.listTypeNew, "want"), eq(w.discoverable, true), eq(h.listTypeNew, "have"))),
  );

  const myWantCollections = db.$with("my_want_collections").as(
    db
      .select({ collectionSlug: listEntries.collectionSlug })
      .from(listEntries)
      .where(and(eq(listEntries.listId, myWantListId), isNotNull(listEntries.collectionSlug))),
  );

  const myHaveCollections = db.$with("my_have_collections").as(
    db
      .select({ collectionSlug: listEntries.collectionSlug })
      .from(listEntries)
      .where(and(eq(listEntries.listId, myHaveListId), isNotNull(listEntries.collectionSlug))),
  );

  // their have entries that I want
  const theirHaves = db.$with("their_haves").as(
    db
      .select({
        userId: tradeActiveHaves.userId,
        listId: tradeActiveHaves.listId,
        listSlug: tradeActiveHaves.listSlug,
        listName: tradeActiveHaves.listName,
        wantListId: tradeActiveHaves.wantListId,
        profileAddress: tradeActiveHaves.profileAddress,
        profileSlug: tradeActiveHaves.profileSlug,
        collectionSlug: listEntries.collectionSlug,
      })
      .from(listEntries)
      .innerJoin(tradeActiveHaves, eq(tradeActiveHaves.listId, listEntries.listId))
      .innerJoin(
        myWantCollections,
        eq(myWantCollections.collectionSlug, listEntries.collectionSlug),
      )
      .where(ne(tradeActiveHaves.userId, userId)),
  );

  // their want entries that I have
  const theirWants = db.$with("their_wants").as(
    db
      .select({
        userId: tradeActiveWants.userId,
        listId: tradeActiveWants.listId,
        listSlug: tradeActiveWants.listSlug,
        listName: tradeActiveWants.listName,
        collectionSlug: listEntries.collectionSlug,
      })
      .from(listEntries)
      .innerJoin(tradeActiveWants, eq(tradeActiveWants.listId, listEntries.listId))
      .innerJoin(
        myHaveCollections,
        eq(myHaveCollections.collectionSlug, listEntries.collectionSlug),
      )
      .where(ne(tradeActiveWants.userId, userId)),
  );

  // a want anchor is answered by their have list, a have anchor by their want list
  const reported = anchorType === "want" ? theirHaves : theirWants;
  const other = anchorType === "want" ? theirWants : theirHaves;

  const rows = await db
    .with(
      tradeActiveHaves,
      tradeActiveWants,
      myWantCollections,
      myHaveCollections,
      theirHaves,
      theirWants,
    )
    .select({
      userId: reported.userId,
      listId: reported.listId,
      listSlug: reported.listSlug,
      listName: reported.listName,
      profileAddress: sql<string | null>`MAX(${theirHaves.profileAddress})`.as("profile_address"),
      profileSlug: sql<string | null>`MAX(${theirHaves.profileSlug})`.as("profile_slug"),
      theyHaveIWant: sql<string[]>`array_agg(DISTINCT ${theirHaves.collectionSlug})`.as(
        "they_have_i_want",
      ),
      iHaveTheyWant: sql<string[]>`array_agg(DISTINCT ${theirWants.collectionSlug})`.as(
        "i_have_they_want",
      ),
    })
    .from(reported)
    .innerJoin(
      other,
      and(eq(theirWants.userId, theirHaves.userId), eq(theirWants.listId, theirHaves.wantListId)),
    )
    .groupBy(reported.userId, reported.listId, reported.listSlug, reported.listName)
    .orderBy(desc(countDistinct(reported.collectionSlug)))
    .limit(PARTNER_LIMIT);

  return rows.map((r) => ({
    userId: r.userId,
    listId: r.listId,
    listSlug: r.listSlug,
    listName: r.listName,
    profileAddress: r.profileAddress,
    profileSlug: r.profileSlug,
    theyHaveIWant: r.theyHaveIWant,
    iHaveTheyWant: r.iHaveTheyWant,
  }));
}

export type PartnerRow = {
  userId: string;
  listId: number;
  listSlug: string;
  listName: string;
  profileAddress: string | null;
  profileSlug: string | null;
  theyHaveIWant: string[];
  iHaveTheyWant: string[];
};

async function buildTradePartnersResponse(
  partners: PartnerRow[],
  sortField: "theyHaveIWant" | "iHaveTheyWant",
) {
  if (partners.length === 0) {
    return { partners: [], collections: {} };
  }

  const userIds = [...new Set(partners.map((r) => r.userId))];
  const allSlugs = [...new Set(partners.flatMap((r) => [...r.theyHaveIWant, ...r.iHaveTheyWant]))];

  const [users, userAddrs, collectionRows] = await Promise.all([
    db.select().from(user).where(inArray(user.id, userIds)),
    db.select().from(userAddress).where(inArray(userAddress.userId, userIds)),
    allSlugs.length > 0
      ? indexer
          .select(getCollectionColumns())
          .from(collections)
          .where(inArray(collections.slug, allSlugs))
      : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const collectionsData = Object.fromEntries(
    collectionRows.map((c) => [c.slug, overrideCollection(c)]),
  );

  // address → nickname map, addresses normalized to lowercase
  const addrNickMap = new Map<string, string>();
  for (const addr of userAddrs) {
    if (addr.nickname) {
      addrNickMap.set(addr.address.toLowerCase(), addr.nickname);
    }
  }

  const order: string[] = [];
  const matchesByUser = new Map<string, PartnerRow[]>();
  for (const row of partners) {
    if (matchesByUser.has(row.userId)) {
      matchesByUser.get(row.userId)!.push(row);
    } else {
      order.push(row.userId);
      matchesByUser.set(row.userId, [row]);
    }
  }

  const tradePartners = order
    .map((userId) => {
      const usr = userMap.get(userId);
      if (!usr) return null;
      const matches = matchesByUser.get(userId) ?? [];

      return {
        userId,
        username: usr.name ?? "unknown",
        user: toPublicUser(usr),
        matches: matches.map((m) => ({
          listId: m.listId,
          listSlug: m.listSlug,
          listName: m.listName,
          profileAddress: m.profileAddress,
          profileSlug: m.profileSlug,
          profileNickname: m.profileAddress
            ? (addrNickMap.get(m.profileAddress.toLowerCase()) ?? null)
            : null,
          theyHaveIWant: m.theyHaveIWant,
          iHaveTheyWant: m.iHaveTheyWant,
        })),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  tradePartners.sort((a, b) => {
    const aTotal = new Set(a.matches.flatMap((m) => m[sortField])).size;
    const bTotal = new Set(b.matches.flatMap((m) => m[sortField])).size;
    return bTotal - aTotal;
  });

  return { partners: tradePartners, collections: collectionsData };
}
