import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries } from "@repo/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod";

import {
  buildListEntries,
  fetchListWithEntries,
  fetchOwnedLists,
  findOwnedList,
} from "../../list.server";
import { authed, optionalAuthed, pub, selectedArtistsMiddleware } from "../orpc";

export const listEntriesRouter = {
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

  profileLists: optionalAuthed
    .input(
      z.object({
        profileAddress: z.string(),
      }),
    )
    .handler(async ({ input: { profileAddress }, context: { session } }) => {
      const owner = await db.query.userAddress.findFirst({
        columns: { privateProfile: true, userId: true },
        where: { address: profileAddress },
      });

      // Hide lists entirely for private profiles unless the requester owns
      // the profile.
      if (owner?.privateProfile && session?.user.id !== owner.userId) {
        return [];
      }

      return await fetchOwnedLists("profileAddress", profileAddress);
    }),

  addObjektsToList: authed
    .use(selectedArtistsMiddleware)
    .input(
      z.object({
        slug: z.string(),
        skipDups: z.boolean(),
        collectionSlugs: z.string().array().max(50000).optional(),
        objekts: z.string().array().max(50000).optional(),
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
        entryIds: z.number().array().max(50000),
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
};
