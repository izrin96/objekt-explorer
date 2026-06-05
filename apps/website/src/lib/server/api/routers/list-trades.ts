import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { listEntries, lists } from "@repo/db/schema";
import { and, countDistinct, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import * as z from "zod";

import { buildTradePartnersResponse, findOwnedList } from "../../list.server";
import { authed } from "../orpc";

export const listTrades = {
  findTradePartners: authed
    .input(
      z.object({
        slug: z.string(),
        mode: z.enum(["have-to-want", "want-to-have", "both"]).optional(),
      }),
    )
    .handler(async ({ input: { slug, mode }, context: { session } }) => {
      const list = await findOwnedList(slug, session.user.id);

      if (!["have", "want"].includes(list.listTypeNew)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "List must be a have or want list",
        });
      }

      // Resolve effective mode: defaults to the natural direction for the list type
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

      // --- Both mode: paired have+want matching (old behavior) ---
      if (effectiveMode === "both") {
        // Partner must have a linked have+want pair; both directions must match.
        const linkedListId = list.linkedListId!;

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
            .where(
              and(eq(w.listTypeNew, "want"), eq(w.discoverable, true), eq(h.listTypeNew, "have")),
            ),
        );

        // CTEs for my entries
        const myAnchorCollections = db.$with("my_anchor_collections").as(
          db
            .select({ collectionSlug: listEntries.collectionSlug })
            .from(listEntries)
            .where(and(eq(listEntries.listId, list.id), isNotNull(listEntries.collectionSlug))),
        );

        const myPairedCollections = db.$with("my_paired_collections").as(
          db
            .select({ collectionSlug: listEntries.collectionSlug })
            .from(listEntries)
            .where(
              and(eq(listEntries.listId, linkedListId), isNotNull(listEntries.collectionSlug)),
            ),
        );

        let partners: Array<{
          userId: string;
          listId: number;
          listSlug: string;
          listName: string;
          profileAddress: string | null;
          profileSlug: string | null;
          theyHaveIWant: string[];
          iHaveTheyWant: string[];
        }> = [];

        if (list.listTypeNew === "want") {
          // Anchor = want list, paired = have list
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
                myAnchorCollections,
                eq(myAnchorCollections.collectionSlug, listEntries.collectionSlug),
              )
              .where(ne(tradeActiveHaves.userId, session.user.id)),
          );

          const theirWants = db.$with("their_wants").as(
            db
              .select({
                userId: tradeActiveWants.userId,
                listId: tradeActiveWants.listId,
                collectionSlug: listEntries.collectionSlug,
              })
              .from(listEntries)
              .innerJoin(tradeActiveWants, eq(tradeActiveWants.listId, listEntries.listId))
              .innerJoin(
                myPairedCollections,
                eq(myPairedCollections.collectionSlug, listEntries.collectionSlug),
              )
              .where(ne(tradeActiveWants.userId, session.user.id)),
          );

          const rows = await db
            .with(
              tradeActiveHaves,
              tradeActiveWants,
              myAnchorCollections,
              myPairedCollections,
              theirHaves,
              theirWants,
            )
            .select({
              userId: theirHaves.userId,
              listId: theirHaves.listId,
              listSlug: theirHaves.listSlug,
              listName: theirHaves.listName,
              profileAddress: sql<string | null>`MAX(${theirHaves.profileAddress})`.as(
                "profile_address",
              ),
              profileSlug: sql<string | null>`MAX(${theirHaves.profileSlug})`.as("profile_slug"),
              theyHaveIWant: sql<string[]>`array_agg(DISTINCT ${theirHaves.collectionSlug})`.as(
                "they_have_i_want",
              ),
              iHaveTheyWant: sql<string[]>`array_agg(DISTINCT ${theirWants.collectionSlug})`.as(
                "i_have_they_want",
              ),
            })
            .from(theirHaves)
            .innerJoin(
              theirWants,
              and(
                eq(theirWants.userId, theirHaves.userId),
                eq(theirWants.listId, theirHaves.wantListId),
              ),
            )
            .groupBy(theirHaves.userId, theirHaves.listId, theirHaves.listSlug, theirHaves.listName)
            .orderBy(desc(countDistinct(theirHaves.collectionSlug)))
            .limit(50);

          partners = rows.map((r) => ({
            userId: r.userId,
            listId: r.listId,
            listSlug: r.listSlug,
            listName: r.listName,
            profileAddress: r.profileAddress,
            profileSlug: r.profileSlug,
            theyHaveIWant: r.theyHaveIWant,
            iHaveTheyWant: r.iHaveTheyWant,
          }));
        } else {
          // Anchor = have list, paired = want list
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
                myAnchorCollections,
                eq(myAnchorCollections.collectionSlug, listEntries.collectionSlug),
              )
              .where(ne(tradeActiveWants.userId, session.user.id)),
          );

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
                myPairedCollections,
                eq(myPairedCollections.collectionSlug, listEntries.collectionSlug),
              )
              .where(ne(tradeActiveHaves.userId, session.user.id)),
          );

          const rows = await db
            .with(
              tradeActiveHaves,
              tradeActiveWants,
              myAnchorCollections,
              myPairedCollections,
              theirWants,
              theirHaves,
            )
            .select({
              userId: theirWants.userId,
              listId: theirWants.listId,
              listSlug: theirWants.listSlug,
              listName: theirWants.listName,
              profileAddress: sql<string | null>`MAX(${theirHaves.profileAddress})`.as(
                "profile_address",
              ),
              profileSlug: sql<string | null>`MAX(${theirHaves.profileSlug})`.as("profile_slug"),
              theyHaveIWant: sql<string[]>`array_agg(DISTINCT ${theirHaves.collectionSlug})`.as(
                "they_have_i_want",
              ),
              iHaveTheyWant: sql<string[]>`array_agg(DISTINCT ${theirWants.collectionSlug})`.as(
                "i_have_they_want",
              ),
            })
            .from(theirWants)
            .innerJoin(
              theirHaves,
              and(
                eq(theirHaves.userId, theirWants.userId),
                eq(theirHaves.wantListId, theirWants.listId),
              ),
            )
            .groupBy(theirWants.userId, theirWants.listId, theirWants.listSlug, theirWants.listName)
            .orderBy(desc(countDistinct(theirWants.collectionSlug)))
            .limit(50);

          partners = rows.map((r) => ({
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

        if (partners.length === 0) {
          return { partners: [], collections: {} };
        }

        return buildTradePartnersResponse(partners, "theyHaveIWant");
      }

      // --- Single-direction modes: have-to-want or want-to-have ---
      // CTE for my list entries — used as filter for matching partner lists
      const myCollections = db.$with("my_collections").as(
        db
          .select({ collectionSlug: listEntries.collectionSlug })
          .from(listEntries)
          .where(and(eq(listEntries.listId, list.id), isNotNull(listEntries.collectionSlug))),
      );

      let partners: Array<{
        userId: string;
        listId: number;
        listSlug: string;
        listName: string;
        profileAddress: string | null;
        profileSlug: string | null;
        theyHaveIWant: string[];
        iHaveTheyWant: string[];
      }> = [];

      if (effectiveMode === "want-to-have") {
        // Anchor = want list. Find discoverable have lists with collections that match my want list.
        const activeHaves = db.$with("active_haves").as(
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
            .where(and(eq(lists.listTypeNew, "have"), eq(lists.discoverable, true))),
        );

        const rows = await db
          .with(myCollections, activeHaves)
          .select({
            userId: activeHaves.userId,
            listId: activeHaves.listId,
            listSlug: activeHaves.listSlug,
            listName: activeHaves.listName,
            profileAddress: activeHaves.profileAddress,
            profileSlug: activeHaves.profileSlug,
            theyHaveIWant: sql<string[]>`array_agg(DISTINCT ${listEntries.collectionSlug})`,
          })
          .from(listEntries)
          .innerJoin(activeHaves, eq(activeHaves.listId, listEntries.listId))
          .innerJoin(myCollections, eq(myCollections.collectionSlug, listEntries.collectionSlug))
          .where(ne(activeHaves.userId, session.user.id))
          .groupBy(
            activeHaves.userId,
            activeHaves.listId,
            activeHaves.listSlug,
            activeHaves.listName,
            activeHaves.profileAddress,
            activeHaves.profileSlug,
          )
          .orderBy(desc(countDistinct(listEntries.collectionSlug)))
          .limit(50);

        partners = rows.map((r) => ({
          userId: r.userId,
          listId: r.listId,
          listSlug: r.listSlug,
          listName: r.listName,
          profileAddress: r.profileAddress,
          profileSlug: r.profileSlug,
          theyHaveIWant: r.theyHaveIWant,
          iHaveTheyWant: [],
        }));
      } else {
        // effectiveMode === "have-to-want"
        // Anchor = have list. Find want lists with collections that match my have list.
        const activeWants = db.$with("active_wants").as(
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
            .where(and(eq(lists.listTypeNew, "want"), eq(lists.discoverable, true))),
        );

        const rows = await db
          .with(myCollections, activeWants)
          .select({
            userId: activeWants.userId,
            listId: activeWants.listId,
            listSlug: activeWants.listSlug,
            listName: activeWants.listName,
            profileAddress: activeWants.profileAddress,
            profileSlug: activeWants.profileSlug,
            iHaveTheyWant: sql<string[]>`array_agg(DISTINCT ${listEntries.collectionSlug})`,
          })
          .from(listEntries)
          .innerJoin(activeWants, eq(activeWants.listId, listEntries.listId))
          .innerJoin(myCollections, eq(myCollections.collectionSlug, listEntries.collectionSlug))
          .where(ne(activeWants.userId, session.user.id))
          .groupBy(
            activeWants.userId,
            activeWants.listId,
            activeWants.listSlug,
            activeWants.listName,
            activeWants.profileAddress,
            activeWants.profileSlug,
          )
          .orderBy(desc(countDistinct(listEntries.collectionSlug)))
          .limit(50);

        partners = rows.map((r) => ({
          userId: r.userId,
          listId: r.listId,
          listSlug: r.listSlug,
          listName: r.listName,
          profileAddress: r.profileAddress,
          profileSlug: r.profileSlug,
          theyHaveIWant: [],
          iHaveTheyWant: r.iHaveTheyWant,
        }));
      }

      if (partners.length === 0) {
        return { partners: [], collections: {} };
      }

      const sortField = list.listTypeNew === "want" ? "theyHaveIWant" : "iHaveTheyWant";
      return buildTradePartnersResponse(partners, sortField);
    }),
};
