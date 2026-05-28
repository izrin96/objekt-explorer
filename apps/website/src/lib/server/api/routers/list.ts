import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, user, userAddress } from "@repo/db/schema";
import { and, countDistinct, desc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import * as z from "zod";

import { toPublicUser } from "../../auth.server";
import {
  buildListEntries,
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
              discoverable: input.discoverable,
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

          // Propagate discoverable to the linked list
          if (linkedListId) {
            await tx
              .update(lists)
              .set({ discoverable: input.discoverable })
              .where(eq(lists.id, linkedListId));
          }
        });
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
          profileSlug = await generateProfileSlug(input.name, input.profileAddress.toLowerCase());
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
              discoverable: input.discoverable,
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

            // Propagate discoverable bidirectionally:
            // if either the new list or the linked list wants discoverable, both get it
            const [linked] = await tx
              .select({ discoverable: lists.discoverable })
              .from(lists)
              .where(eq(lists.id, linkedListId));

            const linkedIsDiscoverable = linked?.discoverable ?? false;
            const shouldBeDiscoverable = input.discoverable || linkedIsDiscoverable;

            if (shouldBeDiscoverable) {
              if (!linkedIsDiscoverable) {
                await tx
                  .update(lists)
                  .set({ discoverable: true })
                  .where(eq(lists.id, linkedListId));
              }
              if (!input.discoverable) {
                await tx
                  .update(lists)
                  .set({ discoverable: true })
                  .where(eq(lists.id, inserted.insertedId));
              }
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
      }),
    )
    .handler(async ({ input: { slug }, context: { session } }) => {
      const list = await findOwnedList(slug, session.user.id);

      if (!["have", "want"].includes(list.listTypeNew)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "List must be a have or want list",
        });
      }

      const linkedListId = list.linkedListId;
      if (!linkedListId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "List is not linked to a paired list",
        });
      }

      // Base CTEs
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
          .where(and(eq(w.listTypeNew, "want"), eq(w.discoverable, true))),
      );

      // CTEs for my entries — used as JOIN filters below
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
          .where(and(eq(listEntries.listId, linkedListId), isNotNull(listEntries.collectionSlug))),
      );

      let partners: Array<{
        userId: string;
        listId: number;
        listSlug: string;
        listName: string;
        theyHaveIWant: string[];
        iHaveTheyWant: string[];
      }> = [];

      switch (list.listTypeNew) {
        case "want": {
          // Anchor = want list, paired = have list
          // theirHaves: what they HAVE that matches my WANT (anchor)
          // theirWants: what they WANT that matches my HAVE (paired)
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
          break;
        }

        case "have": {
          // Anchor = have list, paired = want list
          // theirWants: what they WANT that matches my HAVE (anchor)
          // theirHaves: what they HAVE that matches my WANT (paired)
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
          break;
        }
      }

      if (partners.length === 0) {
        return { partners: [], collections: {} };
      }

      // Group multiple list matches per partner, ranked by total distinct overlap
      const userIds = [...new Set(partners.map((r) => r.userId))];
      const allSlugs = [
        ...new Set(partners.flatMap((r) => [...r.theyHaveIWant, ...r.iHaveTheyWant])),
      ];

      const [users, userAddrs, collectionRows, haveListProfiles] = await Promise.all([
        db.select().from(user).where(inArray(user.id, userIds)),
        db.select().from(userAddress).where(inArray(userAddress.userId, userIds)),
        allSlugs.length > 0
          ? indexer.select().from(collections).where(inArray(collections.slug, allSlugs))
          : Promise.resolve([]),
        db
          .select({
            userId: lists.userId,
            profileAddress: lists.profileAddress,
          })
          .from(lists)
          .where(
            and(
              inArray(lists.userId, userIds),
              eq(lists.listTypeNew, "have"),
              isNotNull(lists.profileAddress),
            ),
          ),
      ]);

      const userMap = new Map(users.map((u) => [u.id, u]));
      const collectionsData = Object.fromEntries(collectionRows.map((c) => [c.slug, c]));

      // Group nicknames per user (deduplicated)
      const nicknamesByUser = new Map<string, Set<string>>();
      for (const addr of userAddrs) {
        if (addr.nickname && addr.userId) {
          const set = nicknamesByUser.get(addr.userId) ?? new Set();
          set.add(addr.nickname);
          nicknamesByUser.set(addr.userId, set);
        }
      }

      // userId → Set of profile addresses from their have lists
      const profileAddrsByUser = new Map<string, Set<string>>();
      for (const list of haveListProfiles) {
        if (list.userId && list.profileAddress) {
          const set = profileAddrsByUser.get(list.userId) ?? new Set();
          set.add(list.profileAddress);
          profileAddrsByUser.set(list.userId, set);
        }
      }

      // address → nickname index per user (only for users with profile-linked have lists)
      const addrNickMapByUser = new Map<string, Map<string, string>>();
      for (const addr of userAddrs) {
        if (addr.nickname && addr.userId && profileAddrsByUser.has(addr.userId)) {
          const map = addrNickMapByUser.get(addr.userId) ?? new Map();
          map.set(addr.address, addr.nickname);
          addrNickMapByUser.set(addr.userId, map);
        }
      }

      // Aggregate matches per partner
      const order: string[] = [];
      const matchesByUser = new Map<string, Array<(typeof partners)[number]>>();
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
          const user = userMap.get(userId);
          if (!user) return null;
          const matches = matchesByUser.get(userId) ?? [];
          const profileAddrs = profileAddrsByUser.get(userId);
          const addrMap = addrNickMapByUser.get(userId);

          const nicknames: string[] = (() => {
            if (profileAddrs && profileAddrs.size > 0 && addrMap) {
              // Only nicknames from userAddresses matching the have list's profile
              return [
                ...new Set(
                  [...profileAddrs]
                    .map((a) => addrMap.get(a))
                    .filter((n): n is string => n != null),
                ),
              ];
            }
            // No profile-linked have list — include all nicknames
            return [...(nicknamesByUser.get(userId) ?? [])];
          })();

          return {
            userId,
            username: user.name ?? "unknown",
            user: toPublicUser(user),
            nicknames,
            matches: matches.map((m) => ({
              listId: m.listId,
              listSlug: m.listSlug,
              listName: m.listName,
              theyHaveIWant: m.theyHaveIWant,
              iHaveTheyWant: m.iHaveTheyWant,
            })),
          };
        })
        .filter((p): p is NonNullable<typeof p> => p != null);

      // Rank partners by total distinct collections they hold that I want
      tradePartners.sort((a, b) => {
        const aTotal = new Set(a.matches.flatMap((m) => m.theyHaveIWant)).size;
        const bTotal = new Set(b.matches.flatMap((m) => m.theyHaveIWant)).size;
        return bTotal - aTotal;
      });

      return { partners: tradePartners, collections: collectionsData };
    }),
};
