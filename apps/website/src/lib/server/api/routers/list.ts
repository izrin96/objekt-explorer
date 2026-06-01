import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists } from "@repo/db/schema";
import { and, countDistinct, desc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import * as z from "zod";

import {
  buildListEntries,
  buildTradePartnersResponse,
  checkProfileOwnership,
  fetchOwnedLists,
  fetchListWithEntries,
  findOwnedList,
  generateProfileSlug,
  checkLinkedList,
  fetchPartialOwnedListCollections,
} from "../../list.server";
import { escapeCSV } from "../../utils.server";
import { authed, pub, selectedArtistsMiddleware } from "../orpc";

export const listRouter = {
  find: authed
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input: { slug }, context: { session } }) => {
      const result = await db.query.lists.findFirst({
        where: { slug, userId: session.user.id },
      });

      if (!result) throw new ORPCError("NOT_FOUND");

      return result;
    }),

  listEntries: pub
    .use(selectedArtistsMiddleware)
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .handler(async ({ input: { slug }, context: { artists } }) => {
      const result = await fetchListWithEntries(slug);

      if (!result) throw new ORPCError("NOT_FOUND");

      return buildListEntries(result.entries, result.isProfileBind, {
        artists,
        hideSerial: result.hideSerial,
      });
    }),

  profileLists: pub
    .input(
      z.object({
        profileAddress: z.string(),
      }),
    )
    .handler(async ({ input: { profileAddress } }) => {
      return await fetchOwnedLists("profileAddress", profileAddress);
    }),

  addObjektsToList: authed
    .use(selectedArtistsMiddleware)
    .input(
      z.object({
        slug: z.string(),
        skipDups: z.boolean(),
        collectionSlugs: z.string().array().optional(),
        objekts: z.string().array().optional(),
      }),
    )
    .handler(
      async ({
        input: { slug, skipDups, collectionSlugs, objekts: inputObjekts },
        context: {
          session: { user },
          artists,
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        if (list.isProfileBind && list.profileAddress) {
          if (!inputObjekts || inputObjekts.length === 0) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Objekts required for profile-bound lists",
            });
          }

          const objektsData = await indexer
            .select({ id: objekts.id, owner: objekts.owner, slug: collections.slug })
            .from(objekts)
            .innerJoin(collections, eq(collections.id, objekts.collectionId))
            .where(inArray(objekts.id, inputObjekts));

          const validObjekts = objektsData.filter(
            (o) => o.owner === list.profileAddress!.toLowerCase(),
          );

          if (validObjekts.length === 0) return [];

          const values = validObjekts.map((objekt) => ({
            listId: list.id,
            objektId: objekt.id,
            collectionSlug: objekt.slug,
          }));

          const result = await db
            .insert(listEntries)
            .values(values)
            .onConflictDoNothing()
            .returning();

          if (result.length === 0) return [];

          return buildListEntries(result, list.isProfileBind, {
            artists,
            hideSerial: list.hideSerial,
          });
        }

        if (!collectionSlugs || collectionSlugs.length === 0) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Collections required for non-profile-bound lists",
          });
        }

        if (skipDups) {
          const uniqueCollectionSlugs = Array.from(new Set(collectionSlugs));

          const entries = await db
            .selectDistinct({
              slug: listEntries.collectionSlug,
            })
            .from(listEntries)
            .where(eq(listEntries.listId, list.id));

          const existingSlugs = new Set(entries.map((a) => a.slug));
          const filteredSlugs = uniqueCollectionSlugs.filter((slug) => !existingSlugs.has(slug));

          if (filteredSlugs.length === 0) return [];

          const result = await db
            .insert(listEntries)
            .values(
              filteredSlugs.map((collectionSlug) => ({
                listId: list.id,
                collectionSlug,
              })),
            )
            .returning();

          return buildListEntries(result, list.isProfileBind, {
            artists,
            hideSerial: list.hideSerial,
          });
        }

        const result = await db
          .insert(listEntries)
          .values(
            collectionSlugs.map((collectionSlug) => ({
              listId: list.id,
              collectionSlug,
            })),
          )
          .returning();

        return buildListEntries(result, list.isProfileBind, {
          artists,
          hideSerial: list.hideSerial,
        });
      },
    ),

  removeObjektsFromList: authed
    .input(
      z.object({
        slug: z.string(),
        entryIds: z.number().array(),
      }),
    )
    .handler(
      async ({
        input: { slug, entryIds },
        context: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        if (entryIds.length === 0) return;

        await db
          .delete(listEntries)
          .where(and(inArray(listEntries.id, entryIds), eq(listEntries.listId, list.id)));
      },
    ),

  edit: authed
    .input(
      z.object({
        slug: z.string(),
        name: z.string().min(1),
        hideUser: z.boolean(),
        gridColumns: z.number().min(2).max(18).nullable(),
        profileAddress: z.string().min(1).nullable(),
        description: z.string().nullable(),
        currency: z.string().max(10).nullable(),
        hideSerial: z.boolean(),
        linkedListId: z.number().nullable(),
        discoverable: z.boolean(),
      }),
    )
    .handler(
      async ({
        input,
        context: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(input.slug, user.id);

        const linkedListId = ["have", "want"].includes(list.listTypeNew)
          ? input.linkedListId
          : null;

        // Validate currency for sale lists
        if (list.listTypeNew === "sale" && !input.currency) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Currency is required for sale lists",
          });
        }

        // Validate profile ownership (skip when isProfileBind — address changes are ignored)
        if (input.profileAddress && !list.isProfileBind) {
          await checkProfileOwnership(input.profileAddress, user.id);
        }

        // Validate linkedListId ownership and type compatibility
        if (linkedListId !== null) {
          await checkLinkedList(list.listTypeNew, linkedListId, user.id);
        }

        let profileSlug: string | null = null;
        if (input.profileAddress) {
          profileSlug = await generateProfileSlug(
            input.name,
            list.slug,
            input.profileAddress.toLowerCase(),
            list.id,
          );
        }

        await db.transaction(async (tx) => {
          await tx
            .update(lists)
            .set({
              name: input.name,
              hideUser: input.hideUser,
              gridColumns: input.gridColumns,
              profileAddress: list.isProfileBind
                ? undefined
                : input.profileAddress
                  ? input.profileAddress.toLowerCase()
                  : null,
              description: input.description,
              currency: list.listTypeNew === "sale" ? input.currency : null,
              profileSlug,
              hideSerial:
                ["sale", "have"].includes(list.listTypeNew) && list.isProfileBind
                  ? input.hideSerial
                  : false,
              linkedListId,
              discoverable: ["have", "sale", "want"].includes(list.listTypeNew)
                ? list.listTypeNew === "want"
                  ? input.discoverable
                  : list.isProfileBind && input.discoverable
                : false,
            })
            .where(eq(lists.id, list.id));

          // Bidirectional link: update reverse links
          if (linkedListId !== list.linkedListId) {
            // Clear old reverse link if there was one
            if (list.linkedListId) {
              await tx
                .update(lists)
                .set({ linkedListId: null })
                .where(eq(lists.id, list.linkedListId));
            }

            // Set new reverse link, clearing any existing partner on the target
            if (linkedListId !== null) {
              await tx
                .update(lists)
                .set({ linkedListId: null })
                .where(and(eq(lists.linkedListId, linkedListId), ne(lists.id, list.id)));

              await tx
                .update(lists)
                .set({ linkedListId: list.id })
                .where(eq(lists.id, linkedListId));
            }
          }

          // Sync discoverable to paired list so both mode works out of the box
          if (linkedListId !== null) {
            await tx
              .update(lists)
              .set({ discoverable: input.discoverable })
              .where(eq(lists.id, linkedListId));
          }
        });

        // return redirect options
        const effectiveProfile = list.isProfileBind
          ? list.profileAddress
          : input.profileAddress?.toLowerCase();

        if (effectiveProfile && profileSlug) {
          const addr = await db.query.userAddress.findFirst({
            columns: { address: true, nickname: true, hideNickname: true },
            where: { address: effectiveProfile },
          });
          const nickname = addr?.nickname && !addr.hideNickname ? addr.nickname : effectiveProfile;

          return {
            to: "/@{$nickname}/list/$slug",
            params: { nickname, slug: profileSlug },
          };
        }

        return {
          to: "/list/$slug",
          params: { slug: input.slug },
        };
      },
    ),

  delete: authed
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .handler(
      async ({
        input: { slug },
        context: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        await db.delete(lists).where(eq(lists.id, list.id));
      },
    ),

  create: authed
    .input(
      z.object({
        name: z.string().min(1),
        hideUser: z.boolean(),
        listTypeNew: z.enum(["general", "sale", "have", "want"]).default("general"),
        isProfileBind: z.boolean().default(false),
        hideSerial: z.boolean().default(false),
        linkedListId: z.number().nullable(),
        profileAddress: z.string().min(1).nullable(),
        description: z.string().nullable(),
        currency: z.string().max(10).nullable(),
        discoverable: z.boolean().default(false),
      }),
    )
    .handler(
      async ({
        input,
        context: {
          session: { user },
        },
      }) => {
        const isProfileBind = ["have", "sale"].includes(input.listTypeNew)
          ? input.isProfileBind
          : false;

        const linkedListId = ["have", "want"].includes(input.listTypeNew)
          ? input.linkedListId
          : null;

        // Validate: sale lists require currency
        if (input.listTypeNew === "sale" && !input.currency) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Currency is required for sale lists",
          });
        }

        // Validate: profile binding requires profile address
        if (isProfileBind && !input.profileAddress) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Profile address is required for profile-bound lists",
          });
        }

        // Validate: profile ownership
        if (input.profileAddress) {
          await checkProfileOwnership(input.profileAddress, user.id);
        }

        // Validate: linked list ownership and type compatibility
        if (linkedListId !== null) {
          await checkLinkedList(input.listTypeNew, linkedListId, user.id);
        }

        const slug = nanoid(9);
        let profileSlug: string | null = null;
        if (input.profileAddress) {
          profileSlug = await generateProfileSlug(
            input.name,
            slug,
            input.profileAddress.toLowerCase(),
          );
        }

        await db.transaction(async (tx) => {
          const [inserted] = await tx
            .insert(lists)
            .values({
              name: input.name,
              userId: user.id,
              slug,
              profileSlug,
              hideUser: input.hideUser,
              listTypeNew: input.listTypeNew,
              isProfileBind,
              hideSerial:
                ["sale", "have"].includes(input.listTypeNew) && isProfileBind
                  ? input.hideSerial
                  : false,
              linkedListId,
              profileAddress: input.profileAddress ? input.profileAddress.toLowerCase() : null,
              description: input.description,
              currency: input.listTypeNew === "sale" ? input.currency : null,
              discoverable: ["have", "sale", "want"].includes(input.listTypeNew)
                ? input.listTypeNew === "want"
                  ? input.discoverable
                  : isProfileBind && input.discoverable
                : false,
            })
            .returning({ insertedId: lists.id });

          // Bidirectional link: clear any existing reverse link on target, then set new one
          if (linkedListId !== null && inserted) {
            await tx
              .update(lists)
              .set({ linkedListId: null })
              .where(and(eq(lists.linkedListId, linkedListId), ne(lists.id, inserted.insertedId)));

            await tx
              .update(lists)
              .set({ linkedListId: inserted.insertedId })
              .where(eq(lists.id, linkedListId));

            // Sync discoverable to paired list so both mode works out of the box
            if (input.discoverable) {
              await tx.update(lists).set({ discoverable: true }).where(eq(lists.id, linkedListId));
            }
          }
        });
      },
    ),

  updateEntryPrices: authed
    .input(
      z.object({
        slug: z.string(),
        updates: z.array(
          z.object({
            entryId: z.number(),
            price: z.number().nullable(),
            isQyop: z.boolean(),
            note: z.string().optional().nullable(),
          }),
        ),
      }),
    )
    .handler(
      async ({
        input: { slug, updates },
        context: {
          session: { user },
        },
      }) => {
        if (updates.length === 0) return;

        const list = await findOwnedList(slug, user.id);

        // Only sale lists can set prices
        if (list.listTypeNew !== "sale") {
          throw new ORPCError("BAD_REQUEST", {
            message: "Only sale lists can set prices",
          });
        }

        await db.transaction(async (tx) => {
          for (const { entryId, price, isQyop, note } of updates) {
            await tx
              .update(listEntries)
              .set({ price, isQyop, note })
              .where(and(eq(listEntries.id, entryId), eq(listEntries.listId, list.id)));
          }
        });
      },
    ),

  generateDiscordFormat: authed
    .input(
      z.object({
        haveListSlug: z.string().optional(),
        wantListSlug: z.string().optional(),
      }),
    )
    .handler(
      async ({
        input: { haveListSlug, wantListSlug },
        context: {
          session: { user },
        },
      }) => {
        const [haveCollections, wantCollections] = await Promise.all([
          haveListSlug ? fetchPartialOwnedListCollections(haveListSlug, user.id) : null,
          wantListSlug ? fetchPartialOwnedListCollections(wantListSlug, user.id) : null,
        ]);

        return { have: haveCollections ?? [], want: wantCollections ?? [] };
      },
    ),

  export: pub
    .use(selectedArtistsMiddleware)
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input: { slug }, context: { artists } }) => {
      const result = await fetchListWithEntries(slug);

      if (!result) throw new ORPCError("NOT_FOUND");

      const entries = await buildListEntries(result.entries, result.isProfileBind, {
        artists,
        hideSerial: result.hideSerial,
      });

      const headers = [
        "collection_slug",
        "collection_id",
        "season",
        "member",
        "artist",
        "class",
        "collection_no",
        "on_offline",
        "serial",
        "token_id",
        "transferable",
        "price",
        "is_qyop",
        "note",
      ];

      const csv = [
        headers.join(","),
        ...entries.map((e) =>
          [
            e.slug,
            e.collectionId,
            e.season,
            e.member,
            e.artist,
            e.class,
            e.collectionNo,
            e.onOffline,
            "serial" in e ? e.serial : "",
            "tokenId" in e ? e.tokenId : "",
            "transferable" in e ? e.transferable : "",
            e.price,
            e.isQyop,
            e.note ?? "",
          ]
            .map((v) => escapeCSV(String(v ?? "")))
            .join(","),
        ),
      ].join("\n");

      return new File([csv], `Export - ${result.slug}.csv`, { type: "text/csv" });
    }),

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
          )
          .orderBy(desc(countDistinct(listEntries.collectionSlug)))
          .limit(50);

        partners = rows.map((r) => ({
          userId: r.userId,
          listId: r.listId,
          listSlug: r.listSlug,
          listName: r.listName,
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
          )
          .orderBy(desc(countDistinct(listEntries.collectionSlug)))
          .limit(50);

        partners = rows.map((r) => ({
          userId: r.userId,
          listId: r.listId,
          listSlug: r.listSlug,
          listName: r.listName,
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
