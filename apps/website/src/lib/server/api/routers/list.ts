import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { listEntries, lists } from "@repo/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as z from "zod";

import {
  buildListEntries,
  checkProfileOwnership,
  fetchOwnedLists,
  fetchListWithEntries,
  findOwnedList,
  generateProfileSlug,
  fetchListCollections,
  checkLinkedList,
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
            .select({ id: objekts.id, owner: objekts.owner })
            .from(objekts)
            .where(inArray(objekts.id, inputObjekts));

          const validObjekts = objektsData
            .filter((o) => o.owner === list.profileAddress!.toLowerCase())
            .map((o) => o.id);

          if (validObjekts.length === 0) return [];

          const values = validObjekts.map((objektId) => ({
            listId: list.id,
            objektId,
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
                .where(eq(lists.linkedListId, linkedListId));

              await tx
                .update(lists)
                .set({ linkedListId: list.id })
                .where(eq(lists.id, linkedListId));
            }
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

        const [result] = await db
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
          })
          .returning({ insertedId: lists.id });

        // Bidirectional link: clear any existing reverse link on target, then set new one
        if (linkedListId !== null && result) {
          await db.transaction(async (tx) => {
            await tx
              .update(lists)
              .set({ linkedListId: null })
              .where(eq(lists.linkedListId, linkedListId));

            await tx
              .update(lists)
              .set({ linkedListId: result.insertedId })
              .where(eq(lists.id, linkedListId));
          });
        }
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
          haveListSlug ? fetchListCollections(haveListSlug, user.id) : null,
          wantListSlug ? fetchListCollections(wantListSlug, user.id) : null,
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
};
