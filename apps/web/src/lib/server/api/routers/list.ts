import { ORPCError } from "@orpc/server";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { type ListEntry, listEntries, lists } from "@repo/db/schema";
import { mapOwnedObjekt, overrideCollection } from "@repo/lib/server/objekt";
import {
  addObjektIdsToProfileList,
  addProfileListToCache,
  invalidateProfileList,
  removeObjektIdsFromProfileList,
} from "@repo/lib/server/redis-profile-lists";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import slugify from "slugify";
import * as z from "zod";

import type { PublicList } from "@/lib/universal/user";

import { mapPublicUser } from "../../auth";
import { parseSelectedArtists } from "../../cookie";
import { getCollectionColumns } from "../../objekt";
import { filterNonNull } from "../../utils";
import { authed, pub } from "../orpc";

export const listRouter = {
  find: authed.input(z.string()).handler(async ({ input: slug, context: { session } }) => {
    const result = await db.query.lists.findFirst({
      columns: {
        name: true,
        hideUser: true,
        gridColumns: true,
        listType: true,
        profileAddress: true,
        profileSlug: true,
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
        const objektIds = result.entries.map((e) => e.objektId).filter(filterNonNull);
        if (objektIds.length === 0) return [];

        // Fetch full objekt data from indexer
        const objektsData = await indexer
          .select({
            objekt: objekts,
            collection: getCollectionColumns(),
          })
          .from(objekts)
          .innerJoin(collections, eq(collections.id, objekts.collectionId))
          .where(
            and(
              inArray(objekts.id, objektIds),
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

        // Map to OwnedObjekt format
        return result.entries
          .map((entry) => {
            const data = objektsData.find((o) => o.objekt.id === entry.objektId);
            if (!data || !data.collection) return null;
            const ownedObjekt = mapOwnedObjekt(data.objekt, data.collection);
            return Object.assign(ownedObjekt, {
              id: entry.id.toString(),
              createdAt: entry.createdAt,
            });
          })
          .filter(filterNonNull);
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
          profileSlug: true,
          listType: true,
          profileAddress: true,
          createdAt: true,
          userId: true,
        },
        where: {
          profileAddress: profileAddress.toLowerCase(),
        },
        orderBy: { createdAt: "desc" },
      });

      // Batch-fetch nicknames for profile addresses
      const addresses = result.map((l) => l.profileAddress).filter(filterNonNull);

      const nicknameMap = await fetchNicknamesForAddresses(addresses);

      return result.map((l) =>
        Object.assign({}, l, {
          nickname: l.profileAddress
            ? (nicknameMap.get(l.profileAddress.toLowerCase()) ?? null)
            : null,
        }),
      );
    }),

  addObjektsToList: authed
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
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        // Handle profile lists
        if (list.listType === "profile") {
          if (!inputObjekts || inputObjekts.length === 0) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Objekts required for profile lists",
            });
          }

          // Verify objekts are owned by the profile
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

          // Insert objekt entries
          // For profile lists, ALWAYS skip duplicates (ignore skipDups flag)
          const values = inputObjekts.map((objektId) => ({
            listId: list.id,
            objektId,
          }));

          // Get existing objektIds to prevent duplicates
          const existing = await db
            .select({ objektId: listEntries.objektId })
            .from(listEntries)
            .where(eq(listEntries.listId, list.id));

          const existingSet = new Set(existing.map((e) => e.objektId).filter(filterNonNull));
          const filtered = values.filter((v) => !existingSet.has(v.objektId));

          if (filtered.length === 0) return [];

          await db.insert(listEntries).values(filtered).onConflictDoNothing();

          await addObjektIdsToProfileList(
            list.profileAddress!,
            list.id,
            filtered.map((v) => v.objektId),
          );

          // Return empty array for now (frontend will refetch)
          return [];
        }

        // Handle normal lists (existing logic)
        if (!collectionSlugs || collectionSlugs.length === 0) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Collections required for normal lists",
          });
        }

        const artists = await parseSelectedArtists();

        if (skipDups) {
          const uniqueCollectionSlugs = Array.from(new Set(collectionSlugs));

          // Get slugs already inserted in this list
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

        const result = await db
          .delete(listEntries)
          .where(and(inArray(listEntries.id, ids), eq(listEntries.listId, list.id)))
          .returning({
            objektId: listEntries.objektId,
          });

        if (list.listType === "profile" && list.profileAddress) {
          if (result.length === 0) return;
          const objektIdsToRemove = result.map((e) => e.objektId).filter(filterNonNull);
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

        // Validate profile ownership if provided
        // Only for normal lists (profile lists have their profileAddress set on create)
        if (list.listType === "normal" && profileAddress) {
          await checkProfileOwnership(profileAddress, user.id);
        }

        const newProfileAddress =
          list.listType === "profile" ? list.profileAddress : (profileAddress ?? null);

        // Generate profileSlug when binding/unbinding normal list
        let newProfileSlug: string | null = null;
        const wasBound = list.profileAddress !== null;
        const isBound = newProfileAddress !== null && newProfileAddress !== "";

        if (list.listType === "normal" && wasBound !== isBound) {
          if (isBound && newProfileAddress) {
            // Binding to profile: generate slugified name
            const listName = name || list.name;
            newProfileSlug = await generateProfileListSlug(
              listName,
              newProfileAddress.toLowerCase(),
            );
          }
          // Unbinding: profileSlug stays null
        } else if (list.listType === "normal" && isBound && name && name !== list.name) {
          // Name changed while bound: regenerate slug with new name
          newProfileSlug = await generateProfileListSlug(name, newProfileAddress.toLowerCase());
        } else if (list.listType === "normal" && wasBound && isBound) {
          // Already bound and not changing - keep existing profileSlug
          newProfileSlug = list.profileSlug;
        } else if (list.listType === "profile") {
          // Profile list: regenerate slug if name changed, otherwise keep existing
          if (name && name !== list.name) {
            newProfileSlug = await generateProfileListSlug(
              name,
              list.profileAddress!.toLowerCase(),
            );
          } else {
            newProfileSlug = list.profileSlug;
          }
        }

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

        // Invalidate Redis cache only for profile lists
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
      }),
    )
    .handler(
      async ({
        input: { name, hideUser, listType, profileAddress },
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

          await checkProfileOwnership(profileAddress, user.id);
        }

        // Validate profile ownership if provided for normal list (binding to profile)
        if (listType === "normal" && profileAddress) {
          await checkProfileOwnership(profileAddress, user.id);
        }

        // Generate slug and profileSlug
        // slug is always nanoid (for /list/[slug] route)
        // profileSlug is slugified name (for /profile-list/[nickname]/[profileSlug] route)
        const slug = nanoid(9);
        let profileSlug: string | null = null;
        if ((listType === "profile" || profileAddress) && profileAddress) {
          profileSlug = await generateProfileListSlug(name, profileAddress.toLowerCase());
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
          })
          .returning({ insertedId: lists.id });

        // Add to Redis cache only for profile lists
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
};

async function fetchNicknamesForAddresses(
  addresses: string[],
): Promise<Map<string, string | null>> {
  if (addresses.length === 0) {
    return new Map();
  }

  const profiles = await db.query.userAddress.findMany({
    columns: { address: true, nickname: true },
    where: { address: { in: addresses } },
  });

  return new Map(profiles.map((p) => [p.address.toLowerCase(), p.nickname]));
}

async function checkProfileOwnership(address: string, userId: string): Promise<void> {
  const owned = await db.query.userAddress.findFirst({
    where: {
      address: address.toLowerCase(),
      userId,
    },
  });

  if (!owned) {
    throw new ORPCError("FORBIDDEN", {
      message: "Profile not owned by user",
    });
  }
}

async function generateProfileListSlug(name: string, profileAddress: string): Promise<string> {
  const baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 2;

  // Check for collisions within this profile's lists
  while (true) {
    const existing = await db.query.lists.findFirst({
      where: { profileAddress, profileSlug: slug },
      columns: { id: true },
    });

    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

async function fetchListCollectionsBySlug(listSlug: string) {
  const list = await db.query.lists.findFirst({
    where: { slug: listSlug },
    with: {
      entries: {
        columns: {
          collectionSlug: true,
          objektId: true,
        },
      },
    },
  });

  if (!list) return [];

  if (list.listType === "profile") {
    const objektIds = list.entries
      .map((e: { objektId: string | null }) => e.objektId)
      .filter(filterNonNull);

    if (objektIds.length === 0) return [];

    const objektsData = await indexer
      .select({
        id: objekts.id,
        collection: getCollectionColumns(),
      })
      .from(objekts)
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(inArray(objekts.id, objektIds));

    const objektToCollection = new Map(objektsData.map((o) => [o.id, o.collection]));

    return list.entries
      .filter((e: { objektId: string | null }) => e.objektId !== null)
      .map((e: { objektId: string | null }) => {
        const collection = objektToCollection.get(e.objektId!);
        return collection ? overrideCollection(collection) : null;
      })
      .filter(filterNonNull);
  }

  const slugs = list.entries
    .map((e: { collectionSlug: string | null }) => e.collectionSlug)
    .filter(filterNonNull);

  if (slugs.length === 0) return [];

  const foundCollections = await indexer
    .select({
      ...getCollectionColumns(),
    })
    .from(collections)
    .where(inArray(collections.slug, slugs));

  const slugToCollection = new Map(foundCollections.map((c) => [c.slug, c]));

  return list.entries
    .filter((e: { collectionSlug: string | null }) => e.collectionSlug !== null)
    .map((e: { collectionSlug: string | null }) => {
      const collection = slugToCollection.get(e.collectionSlug!);
      return collection ? overrideCollection(collection) : null;
    })
    .filter(filterNonNull);
}

export async function fetchList(slug: string, profileAddress?: string): Promise<PublicList | null> {
  const result = await db.query.lists.findFirst({
    columns: {
      slug: true,
      name: true,
      hideUser: true,
      gridColumns: true,
      userId: true,
      listType: true,
      profileAddress: true,
      profileSlug: true,
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
    where: profileAddress
      ? { profileSlug: slug, profileAddress: profileAddress.toLowerCase() }
      : { slug },
  });

  if (!result) return null;

  return {
    name: result.name,
    slug: result.slug,
    profileSlug: result.profileSlug,
    gridColumns: result.gridColumns,
    user: result.hideUser || !result.user ? null : mapPublicUser(result.user),
    listType: result.listType,
    profileAddress: result.profileAddress,
    ownerId: result.userId,
  };
}

export async function fetchOwnedLists(userId: string) {
  const result = await db.query.lists.findMany({
    columns: {
      name: true,
      slug: true,
      profileSlug: true,
      listType: true,
      profileAddress: true,
    },
    where: { userId },
    orderBy: { id: "desc" },
  });

  // Batch-fetch nicknames for profile addresses
  const addresses = result.map((l) => l.profileAddress).filter(filterNonNull);

  const nicknameMap = await fetchNicknamesForAddresses(addresses);

  return result.map((l) =>
    Object.assign({}, l, {
      nickname: l.profileAddress ? (nicknameMap.get(l.profileAddress.toLowerCase()) ?? null) : null,
    }),
  );
}

async function findOwnedList(slug: string, userId: string) {
  const list = await db.query.lists.findFirst({
    columns: {
      id: true,
      name: true,
      slug: true,
      listType: true,
      profileAddress: true,
      profileSlug: true,
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
