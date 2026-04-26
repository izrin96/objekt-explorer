import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { listEntries, lists } from "@repo/db/schema";
import {
  addObjektIdsToProfileList,
  addProfileListToCache,
  invalidateProfileList,
  removeObjektIdsFromProfileList,
} from "@repo/lib/server/redis-profile-lists";
import { fetchKnownAddresses } from "@repo/lib/server/user";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as z from "zod";

import {
  buildListEntries,
  checkProfileOwnership,
  fetchListCollectionsBySlug,
  fetchOwnedLists,
  fetchListWithEntries,
  findOwnedList,
  generateProfileSlug,
  resolveProfileSlugUpdate,
} from "../../list.server";
import { escapeCSV } from "../../utils.server";
import { authed, pub, selectedArtistsMiddleware } from "../orpc";

export const listRouter = {
  find: authed.input(z.string()).handler(async ({ input: slug, context: { session } }) => {
    const result = await db.query.lists.findFirst({
      columns: {
        name: true,
        hideUser: true,
        gridColumns: true,
        listType: true,
        profileAddress: true,
        description: true,
        currency: true,
      },
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

      return buildListEntries(result.entries, result.listType, { artists });
    }),

  list: authed.handler(async ({ context: { session } }) => {
    const { user } = session;
    const result = await fetchOwnedLists(user.id);
    return result;
  }),

  profileLists: pub
    .input(
      z.object({
        profileAddress: z.string(),
      }),
    )
    .handler(async ({ input: { profileAddress } }) => {
      const result = await db.query.lists.findMany({
        columns: {
          name: true,
          slug: true,
          profileSlug: true,
          listType: true,
          profileAddress: true,
        },
        where: {
          profileAddress: profileAddress.toLowerCase(),
        },
        orderBy: { id: "desc" },
      });
      const knownAddresses = await fetchKnownAddresses(
        result.map((a) => a.profileAddress).filter((a) => a !== null),
      );

      const addressMap = new Map(knownAddresses.map((a) => [a.address.toLowerCase(), a]));

      return result.map((l) => {
        const addr = addressMap.get(l.profileAddress?.toLowerCase() ?? "");
        return {
          name: l.name,
          slug: l.slug,
          profileSlug: l.profileSlug,
          listType: l.listType,
          profileAddress: l.profileAddress,
          nickname: addr?.hideNickname ? undefined : (addr?.nickname ?? undefined),
        };
      });
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

        if (list.listType === "profile") {
          if (!inputObjekts || inputObjekts.length === 0) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Objekts required for profile lists",
            });
          }

          const ownedCount = await indexer
            .select({ id: objekts.id })
            .from(objekts)
            .where(
              and(
                inArray(objekts.id, inputObjekts),
                eq(objekts.owner, list.profileAddress!.toLowerCase()),
              ),
            );

          if (ownedCount.length !== inputObjekts.length) {
            const ownedSet = new Set(ownedCount.map((o) => o.id));
            const notOwned = inputObjekts.filter((id) => !ownedSet.has(id));
            throw new ORPCError("BAD_REQUEST", {
              message: `Objekts not owned by profile: ${notOwned.join(", ")}`,
            });
          }

          const values = inputObjekts.map((objektId) => ({
            listId: list.id,
            objektId,
          }));

          const existing = await db
            .select({ objektId: listEntries.objektId })
            .from(listEntries)
            .where(eq(listEntries.listId, list.id));

          const existingSet = new Set(existing.map((e) => e.objektId).filter((a) => a !== null));
          const filtered = values.filter((v) => !existingSet.has(v.objektId));

          if (filtered.length === 0) return [];

          const result = await db
            .insert(listEntries)
            .values(filtered)
            .onConflictDoNothing()
            .returning();

          await addObjektIdsToProfileList(
            list.profileAddress!,
            list.id,
            filtered.map((v) => v.objektId),
          );

          return buildListEntries(result, list.listType, { artists });
        }

        if (!collectionSlugs || collectionSlugs.length === 0) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Collections required for normal lists",
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
                collectionSlug: collectionSlug,
              })),
            )
            .returning();

          return buildListEntries(result, list.listType, { artists });
        }

        const result = await db
          .insert(listEntries)
          .values(
            collectionSlugs.map((collectionSlug) => ({
              listId: list.id,
              collectionSlug: collectionSlug,
            })),
          )
          .returning();

        return buildListEntries(result, list.listType, { artists });
      },
    ),

  removeObjektsFromList: authed
    .input(
      z.object({
        slug: z.string(),
        ids: z.number().array(),
      }),
    )
    .handler(
      async ({
        input: { slug, ids },
        context: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        if (ids.length === 0) return;

        const result = await db
          .delete(listEntries)
          .where(and(inArray(listEntries.id, ids), eq(listEntries.listId, list.id)))
          .returning({
            objektId: listEntries.objektId,
          });

        if (list.listType === "profile" && list.profileAddress) {
          if (result.length === 0) return;
          const objektIdsToRemove = result.map((e) => e.objektId).filter((a) => a !== null);
          await removeObjektIdsFromProfileList(list.profileAddress, list.id, objektIdsToRemove);
        }
      },
    ),

  edit: authed
    .input(
      z.object({
        slug: z.string(),
        name: z.string().min(1).optional(),
        hideUser: z.boolean().optional(),
        gridColumns: z.number().min(2).max(18).optional().nullable(),
        profileAddress: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        currency: z.string().max(10).optional().nullable(),
      }),
    )
    .handler(
      async ({
        input: { slug, name, profileAddress, ...rest },
        context: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        if (list.listType === "normal" && profileAddress) {
          await checkProfileOwnership(profileAddress, user.id);
        }

        const newProfileAddress =
          list.listType === "profile" ? list.profileAddress : (profileAddress ?? null);

        const newProfileSlug = await resolveProfileSlugUpdate(list, name, newProfileAddress);

        await db
          .update(lists)
          .set({
            ...rest,
            name: name ?? list.name,
            profileAddress: newProfileAddress?.toLowerCase() ?? null,
            profileSlug: newProfileSlug,
          })
          .where(eq(lists.id, list.id));
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

        if (list.listType === "profile" && list.profileAddress) {
          await invalidateProfileList(list.profileAddress);
        }
      },
    ),

  create: authed
    .input(
      z.object({
        name: z.string().min(1),
        hideUser: z.boolean(),
        listType: z.enum(["normal", "profile"]).default("normal"),
        profileAddress: z.string().optional(),
        description: z.string().optional().nullable(),
        currency: z.string().max(10).optional().nullable(),
      }),
    )
    .handler(
      async ({
        input: { name, hideUser, listType, profileAddress, description, currency },
        context: {
          session: { user },
        },
      }) => {
        if (listType === "profile") {
          if (!profileAddress) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Profile address required for profile lists",
            });
          }

          await checkProfileOwnership(profileAddress, user.id);
        }

        if (listType === "normal" && profileAddress) {
          await checkProfileOwnership(profileAddress, user.id);
        }

        const slug = nanoid(9);
        let profileSlug: string | null = null;
        if ((listType === "profile" || profileAddress) && profileAddress) {
          profileSlug = await generateProfileSlug(name, profileAddress.toLowerCase());
        }

        const [result] = await db
          .insert(lists)
          .values({
            name,
            userId: user.id,
            slug,
            profileSlug,
            hideUser,
            listType,
            profileAddress: profileAddress?.toLowerCase(),
            description,
            currency,
          })
          .returning({ insertedId: lists.id });

        if (listType === "profile" && profileAddress) {
          if (result) {
            await addProfileListToCache({
              listId: result.insertedId,
              profileAddress: profileAddress.toLowerCase(),
              objektIds: [],
            });
          }
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

        for (const { entryId, price, isQyop, note } of updates) {
          await db
            .update(listEntries)
            .set({ price, isQyop, note })
            .where(and(eq(listEntries.id, entryId), eq(listEntries.listId, list.id)));
        }
      },
    ),

  generateDiscordFormat: authed
    .input(
      z.object({
        haveListSlug: z.string().optional(),
        wantListSlug: z.string().optional(),
      }),
    )
    .handler(async ({ input: { haveListSlug, wantListSlug } }) => {
      const [haveCollections, wantCollections] = await Promise.all([
        haveListSlug ? fetchListCollectionsBySlug(haveListSlug) : [],
        wantListSlug ? fetchListCollectionsBySlug(wantListSlug) : [],
      ]);

      return { have: haveCollections, want: wantCollections };
    }),

  export: pub
    .use(selectedArtistsMiddleware)
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input: { slug }, context: { artists } }) => {
      const result = await fetchListWithEntries(slug);

      if (!result) throw new ORPCError("NOT_FOUND");

      const entries = await buildListEntries(result.entries, result.listType, { artists });

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

      const rows = entries.map((e) => {
        return [
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
          e.note ? escapeCSV(e.note) : "",
        ].join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");

      return new File([csv], `Export - ${slug}.csv`, { type: "text/csv" });
    }),
};
