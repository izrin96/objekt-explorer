import type { ValidArtist } from "@repo/cosmo/types/common";

import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { type ListEntry, listEntries, lists } from "@repo/db/schema";
import { mapOwnedObjekt, overrideCollection } from "@repo/lib/server/objekt";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import slugify from "slugify";
import * as z from "zod";

import type { Outputs } from "@/lib/orpc/server";
import type { PublicList } from "@/lib/universal/user";

import { mapPublicUser } from "../../auth";
import { parseSelectedArtists } from "../../cookie";
import { getCollectionColumns } from "../../objekt";
import { authed, pub } from "../orpc";

/**
 * Generate a unique, human-readable slug for a profile list.
 * Handles collisions by appending -2, -3, etc.
 */
async function generateProfileListSlug(name: string, profileAddress: string): Promise<string> {
  const baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 2;

  // Check for collisions within this profile's lists
  while (true) {
    const existing = await db.query.lists.findFirst({
      where: { profileAddress, slug, listType: "profile" },
      columns: { id: true },
    });

    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

export const listRouter = {
  find: authed.input(z.string()).handler(async ({ input: slug, context: { session } }) => {
    const result = await db.query.lists.findFirst({
      columns: {
        name: true,
        hideUser: true,
        gridColumns: true,
        listType: true,
        profileAddress: true,
      },
      where: { slug, userId: session.user.id },
    });

    if (!result) throw new ORPCError("NOT_FOUND");

    return result;
  }),

  listEntries: pub
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .handler(async ({ input: { slug } }) => {
      const artists = await parseSelectedArtists();
      const result = await db.query.lists.findFirst({
        columns: {
          listType: true,
          profileAddress: true,
        },
        with: {
          entries: {
            orderBy: {
              id: "desc",
            },
            columns: {
              id: true,
              createdAt: true,
              collectionSlug: true,
              objektId: true,
            },
          },
        },
        where: { slug },
      });

      if (!result) throw new ORPCError("NOT_FOUND");

      // Handle profile lists differently
      if (result.listType === "profile") {
        const objektIds = result.entries.map((e) => e.objektId).filter(Boolean) as string[];
        if (objektIds.length === 0) return [];

        // Fetch full objekt data from indexer
        const objektsData = await indexer.query.objekts.findMany({
          where: { id: { in: objektIds } },
          with: {
            collection: true,
          },
        });

        // Map to OwnedObjekt format
        return result.entries
          .map((entry) => {
            const data = objektsData.find((o) => o.id === entry.objektId);
            if (!data || !data.collection) return null;
            const ownedObjekt = mapOwnedObjekt(data, data.collection);
            return Object.assign(ownedObjekt, {
              entryId: entry.id.toString(),
              createdAt: entry.createdAt,
            });
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);
      }

      // Handle normal lists
      return mapEntriesCollection(result.entries, artists);
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
          listType: true,
          profileAddress: true,
          displayProfileAddress: true,
          createdAt: true,
          userId: true,
        },
        where: {
          OR: [
            {
              listType: "profile",
              profileAddress: profileAddress.toLowerCase(),
            },
            {
              displayProfileAddress: profileAddress.toLowerCase(),
            },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      return result;
    }),

  addObjektsToList: authed
    .input(
      z.object({
        slug: z.string(),
        skipDups: z.boolean(),
        collectionSlugs: z.string().array().optional(),
        objekts: z
          .object({
            objektId: z.string(),
          })
          .array()
          .optional(),
      }),
    )
    .handler(
      async ({
        input: { slug, skipDups, collectionSlugs, objekts: inputObjekts },
        context: {
          session: { user },
        },
      }) => {
        const artists = await parseSelectedArtists();
        const list = await findOwnedList(slug, user.id);

        // Handle profile lists
        if (list.listType === "profile") {
          if (!inputObjekts || inputObjekts.length === 0) {
            throw new ORPCError("BAD_REQUEST", {
              message: "objekts required for profile lists",
            });
          }

          // Verify objekts are owned by the profile
          const objektIds = inputObjekts.map((o) => o.objektId);
          const currentObjekts = await indexer
            .select({ id: objekts.id, owner: objekts.owner })
            .from(objekts)
            .where(inArray(objekts.id, objektIds));

          const notOwned = currentObjekts.filter(
            (o) => o.owner.toLowerCase() !== list.profileAddress!.toLowerCase(),
          );

          if (notOwned.length > 0) {
            throw new ORPCError("BAD_REQUEST", {
              message: `Objekts not owned by profile: ${notOwned.map((o) => o.id).join(", ")}`,
            });
          }

          // Insert objekt entries
          const values = inputObjekts.map((o) => ({
            listId: list.id,
            objektId: o.objektId,
          }));

          if (skipDups) {
            // Get existing objektIds
            const existing = await db
              .select({ objektId: listEntries.objektId })
              .from(listEntries)
              .where(eq(listEntries.listId, list.id));

            const existingSet = new Set(existing.map((e) => e.objektId).filter(Boolean));
            const filtered = values.filter((v) => !existingSet.has(v.objektId));

            if (filtered.length === 0) return [];

            await db.insert(listEntries).values(filtered);
          } else {
            await db.insert(listEntries).values(values).onConflictDoNothing();
          }

          // Return empty array for now (frontend will refetch)
          return [];
        }

        // Handle normal lists (existing logic)
        if (!collectionSlugs || collectionSlugs.length === 0) {
          throw new ORPCError("BAD_REQUEST", {
            message: "collectionSlugs required for normal lists",
          });
        }

        if (skipDups) {
          const uniqueCollectionSlugs = Array.from(new Set(collectionSlugs));

          // get all slug that already inserted
          const entries = await db
            .selectDistinct({
              slug: listEntries.collectionSlug,
            })
            .from(listEntries)
            .where(eq(listEntries.listId, list.id));

          const existingSlugs = new Set(entries.map((a) => a.slug));
          const filtered = uniqueCollectionSlugs.filter((slug) => !existingSlugs.has(slug));

          if (filtered.length === 0) return [];

          const result = await db
            .insert(listEntries)
            .values(
              filtered.map((collectionSlug) => ({
                listId: list.id,
                collectionSlug: collectionSlug,
              })),
            )
            .returning();

          return mapEntriesCollection(
            result.toSorted((a, b) => b.id - a.id),
            artists,
          );
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

        return mapEntriesCollection(
          result.toSorted((a, b) => b.id - a.id),
          artists,
        );
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

        await db
          .delete(listEntries)
          .where(and(inArray(listEntries.id, ids), eq(listEntries.listId, list.id)));
      },
    ),

  edit: authed
    .input(
      z.object({
        slug: z.string(),
        name: z.string().min(1).optional(),
        hideUser: z.boolean().optional(),
        gridColumns: z.number().min(2).max(18).optional().nullable(),
      }),
    )
    .handler(
      async ({
        input: { slug, ...rest },
        context: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        await db
          .update(lists)
          .set({
            ...rest,
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
      },
    ),

  create: authed
    .input(
      z.object({
        name: z.string().min(1),
        hideUser: z.boolean(),
        listType: z.enum(["normal", "profile"]).default("normal"),
        profileAddress: z.string().optional(),
        displayProfileAddress: z.string().optional(),
      }),
    )
    .handler(
      async ({
        input: { name, hideUser, listType, profileAddress, displayProfileAddress },
        context: {
          session: { user },
        },
      }) => {
        // Validate profile ownership for profile lists
        if (listType === "profile") {
          if (!profileAddress) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Profile address required for profile lists",
            });
          }

          const owned = await db.query.userAddress.findFirst({
            where: {
              address: profileAddress.toLowerCase(),
              userId: user.id,
            },
          });

          if (!owned) {
            throw new ORPCError("FORBIDDEN", {
              message: "Profile not owned by user",
            });
          }
        }

        // Validate display profile ownership if provided for normal list
        if (listType === "normal" && displayProfileAddress) {
          const owned = await db.query.userAddress.findFirst({
            where: {
              address: displayProfileAddress.toLowerCase(),
              userId: user.id,
            },
          });

          if (!owned) {
            throw new ORPCError("FORBIDDEN", {
              message: "Display profile not owned by user",
            });
          }
        }

        // Generate appropriate slug
        let slug: string;
        if (listType === "profile" && profileAddress) {
          slug = await generateProfileListSlug(name, profileAddress.toLowerCase());
        } else {
          slug = nanoid(9);
        }

        await db.insert(lists).values({
          name: name,
          userId: user.id,
          slug: slug,
          hideUser: hideUser,
          listType: listType,
          profileAddress: profileAddress?.toLowerCase(),
          displayProfileAddress: displayProfileAddress?.toLowerCase(),
        });
      },
    ),

  generateDiscordFormat: authed
    .input(
      z.object({
        haveSlug: z.string().optional(),
        wantSlug: z.string().optional(),
      }),
    )
    .handler(async ({ input: { haveSlug, wantSlug } }) => {
      // get slugs to query
      const slugs = [haveSlug, wantSlug].filter((s) => s !== undefined);

      if (slugs.length === 0) {
        return { have: [], want: [] };
      }

      // get both list
      const foundLists = await db.query.lists.findMany({
        where: { slug: { in: slugs } },
        with: {
          entries: {
            columns: {
              collectionSlug: true,
            },
          },
        },
      });

      const uniqueCollectionSlug = new Set(
        foundLists
          .flatMap((a) => a.entries)
          .map((a) => a.collectionSlug)
          .filter((slug): slug is string => slug !== null),
      );

      if (uniqueCollectionSlug.size === 0) return { have: [], want: [] };

      // get all collections based on both list
      const foundCollections = await indexer.query.collections.findMany({
        where: { slug: { in: Array.from(uniqueCollectionSlug) } },
        columns: {
          slug: true,
          season: true,
          collectionNo: true,
          member: true,
          artist: true,
          collectionId: true,
          class: true,
        },
      });

      const collectionsMap = new Map(foundCollections.map((c) => [c.slug, c]));

      // entry for both list
      const haveList = haveSlug ? foundLists.find((a) => a.slug === haveSlug) : undefined;
      const wantList = wantSlug ? foundLists.find((a) => a.slug === wantSlug) : undefined;

      const have =
        haveList?.entries
          .filter((a) => a.collectionSlug !== null)
          .map((a) => collectionsMap.get(a.collectionSlug!))
          .filter((c) => c !== undefined) ?? [];

      const want =
        wantList?.entries
          .filter((a) => a.collectionSlug !== null)
          .map((a) => collectionsMap.get(a.collectionSlug!))
          .filter((c) => c !== undefined) ?? [];

      return {
        have,
        want,
      };
    }),
};

export type ListEntriesOutput = Outputs["list"]["listEntries"];

export async function fetchList(slug: string, userId?: string): Promise<PublicList | null> {
  const result = await db.query.lists.findFirst({
    columns: {
      slug: true,
      name: true,
      hideUser: true,
      gridColumns: true,
      userId: true,
      listType: true,
      profileAddress: true,
      displayProfileAddress: true,
    },
    with: {
      user: {
        columns: {
          name: true,
          username: true,
          image: true,
          discord: true,
          twitter: true,
          displayUsername: true,
          showSocial: true,
        },
      },
    },
    where: { slug },
  });

  if (!result) return null;

  return {
    name: result.name,
    slug: result.slug,
    gridColumns: result.gridColumns,
    user: result.hideUser || !result.user ? null : mapPublicUser(result.user),
    isOwned: userId ? result.userId === userId : undefined,
    listType: result.listType,
    profileAddress: result.profileAddress,
    displayProfileAddress: result.displayProfileAddress,
  };
}

export async function fetchOwnedLists(userId: string) {
  const result = await db.query.lists.findMany({
    columns: {
      name: true,
      slug: true,
      listType: true,
      profileAddress: true,
      displayProfileAddress: true,
    },
    where: { userId },
    orderBy: { id: "desc" },
  });
  return result;
}

async function findOwnedList(slug: string, userId: string) {
  const list = await db.query.lists.findFirst({
    columns: {
      id: true,
      listType: true,
      profileAddress: true,
    },
    where: { slug, userId },
  });

  if (!list) throw new ORPCError("NOT_FOUND");

  return list;
}

async function fetchCollections(slugs: string[], artists: ValidArtist[]) {
  const uniqueSlugs = new Set(slugs);

  if (uniqueSlugs.size === 0) return [];

  const result = await indexer
    .select({
      ...getCollectionColumns(),
    })
    .from(collections)
    .where(
      and(
        inArray(collections.slug, Array.from(uniqueSlugs)),
        ...(artists.length
          ? [
              inArray(
                collections.artist,
                artists.map((a) => a.toLowerCase()),
              ),
            ]
          : []),
      ),
    );

  return result.map(overrideCollection);
}

async function mapEntriesCollection(
  result: Pick<ListEntry, "collectionSlug" | "id" | "createdAt">[],
  artists: ValidArtist[],
) {
  const validEntries = result.filter((a) => a.collectionSlug !== null);

  const slugs = validEntries.map((a) => a.collectionSlug!);
  const collections = await fetchCollections(slugs, artists);
  const collectionsMap = new Map(collections.map((c) => [c.slug, c]));

  return validEntries
    .filter((a) => collectionsMap.has(a.collectionSlug!))
    .map(({ collectionSlug, id, createdAt }) =>
      Object.assign({}, collectionsMap.get(collectionSlug!), {
        id: id.toString(),
        createdAt,
      }),
    );
}
