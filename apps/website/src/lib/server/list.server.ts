import { ORPCError } from "@orpc/server";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { lists } from "@repo/db/schema";
import type { List, ListEntry } from "@repo/db/schema";
import { mapOwnedObjekt, overrideCollection } from "@repo/lib/server/objekt";
import { fetchKnownAddresses } from "@repo/lib/server/user";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, eq, inArray, ne } from "drizzle-orm";
import slugify from "slugify";

import type { PublicList } from "../universal/user";
import { mapPublicUser } from "./auth.server";
import { getCollectionColumns } from "./objekt.server";

export interface ListEntryTransformConfig {
  artists?: ValidArtist[];
}

export async function fetchCollectionsBySlug(slugs: string[], artists: ValidArtist[]) {
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

async function buildProfileListEntries(
  entries: Pick<ListEntry, "collectionSlug" | "objektId" | "id" | "price" | "isQyop" | "note">[],
  config?: ListEntryTransformConfig,
): Promise<ValidObjekt[]> {
  const objektIds = entries.map((e) => e.objektId).filter((a) => a !== null);

  if (objektIds.length === 0) return [];

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
        ...(config?.artists?.length
          ? [
              inArray(
                collections.artist,
                config.artists.map((a) => a.toLowerCase()),
              ),
            ]
          : []),
      ),
    );

  const objektMap = new Map(objektsData.map((o) => [o.objekt.id, o]));

  return entries
    .filter((e) => e.objektId !== null)
    .map((entry) => {
      const data = objektMap.get(entry.objektId!);
      if (!data || !data.collection) return null;
      const ownedObjekt = mapOwnedObjekt(data.objekt, data.collection);
      return Object.assign({}, ownedObjekt, {
        id: entry.id.toString(),
        order: entry.id,
        price: entry.price ?? undefined,
        isQyop: entry.isQyop ?? undefined,
        note: entry.note ?? undefined,
      });
    })
    .filter((a) => a !== null);
}

type EntryPick = Pick<
  ListEntry,
  "collectionSlug" | "objektId" | "id" | "price" | "isQyop" | "note"
>;

async function buildNormalListEntries(
  entries: EntryPick[],
  config?: ListEntryTransformConfig,
): Promise<ValidObjekt[]> {
  const validEntries = entries
    .toSorted((a, b) => a.id - b.id)
    .filter((a) => a.collectionSlug !== null);

  const slugs = validEntries.map((a) => a.collectionSlug!);
  const collectionsData = await fetchCollectionsBySlug(slugs, config?.artists ?? []);
  const collectionsMap = new Map(collectionsData.map((c) => [c.slug, c]));

  return validEntries
    .filter((a) => collectionsMap.has(a.collectionSlug!))
    .map((entry) => {
      const collectionSlug = entry.collectionSlug!;
      const collection = collectionsMap.get(collectionSlug)!;
      return Object.assign({}, collection, {
        id: entry.id.toString(),
        order: entry.id,
        price: entry.price ?? undefined,
        isQyop: entry.isQyop ?? undefined,
        note: entry.note ?? undefined,
      });
    });
}

export async function buildListEntries(
  entries: Pick<ListEntry, "collectionSlug" | "objektId" | "id" | "price" | "isQyop" | "note">[],
  listType: "normal" | "profile",
  config?: ListEntryTransformConfig,
): Promise<ValidObjekt[]> {
  if (listType === "profile") {
    return buildProfileListEntries(entries, config);
  }
  return buildNormalListEntries(entries, config);
}

export function sanitizePublicList(
  list: PublicList,
  currentUserId?: string,
): Omit<PublicList, "ownerId"> {
  const { ownerId, ...safeList } = list;
  return {
    ...safeList,
    isOwned: ownerId && currentUserId ? ownerId === currentUserId : false,
  };
}

export async function fetchListWithEntries(slug: string) {
  return db.query.lists.findFirst({
    columns: {
      id: true,
      name: true,
      listType: true,
      profileAddress: true,
      profileSlug: true,
    },
    with: {
      entries: {
        orderBy: { id: "asc" },
        columns: {
          id: true,
          collectionSlug: true,
          objektId: true,
          price: true,
          isQyop: true,
          note: true,
        },
      },
    },
    where: { slug },
  });
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
      description: true,
      currency: true,
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
    description: result.description,
    currency: result.currency,
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
}

export async function checkProfileOwnership(address: string, userId: string): Promise<void> {
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

export function slugifyName(name: string): string {
  return slugify(name, { lower: true, strict: true });
}

export async function generateProfileSlug(
  name: string,
  profileAddress: string,
  excludeListId?: number,
): Promise<string> {
  const baseSlug = slugifyName(name);
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await db
      .select({ id: lists.id })
      .from(lists)
      .where(
        and(
          eq(lists.profileAddress, profileAddress),
          eq(lists.profileSlug, slug),
          ...(excludeListId ? [ne(lists.id, excludeListId)] : []),
        ),
      )
      .limit(1);

    if (existing.length === 0) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

export async function resolveProfileSlugUpdate(
  list: Pick<List, "profileAddress" | "profileSlug" | "name" | "id">,
  name: string | undefined,
  newProfileAddress: string | null,
): Promise<string | null> {
  const isBound = newProfileAddress !== null && newProfileAddress !== "";

  if (!isBound) return null;

  const wasBound = list.profileAddress !== null;

  if (!wasBound) {
    return generateProfileSlug(name ?? list.name, newProfileAddress.toLowerCase(), list.id);
  }

  const nameChanged = name !== undefined && slugifyName(name) !== slugifyName(list.name);

  if (nameChanged) {
    return generateProfileSlug(name!, newProfileAddress.toLowerCase(), list.id);
  }

  return list.profileSlug;
}

export async function findOwnedList(slug: string, userId: string) {
  const list = await db.query.lists.findFirst({
    columns: {
      id: true,
      name: true,
      listType: true,
      profileAddress: true,
      profileSlug: true,
    },
    where: { slug, userId },
  });

  if (!list) throw new ORPCError("NOT_FOUND");

  return list;
}

export async function fetchListCollectionsBySlug(listSlug: string) {
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
    const objektIds = list.entries.map((e) => e.objektId).filter((a) => a !== null);

    if (objektIds.length === 0) return [];

    const objektsData = await indexer
      .select({
        id: objekts.id,
        collection: {
          slug: collections.slug,
          season: collections.season,
          collectionNo: collections.collectionNo,
          member: collections.member,
          artist: collections.artist,
          collectionId: collections.collectionId,
          class: collections.class,
        },
      })
      .from(objekts)
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(inArray(objekts.id, objektIds));

    const objektToCollection = new Map(objektsData.map((o) => [o.id, o.collection]));

    return list.entries
      .filter((e) => e.objektId !== null)
      .map((e) => {
        const collection = objektToCollection.get(e.objektId!);
        return collection ?? null;
      })
      .filter((a) => a !== null);
  }

  const slugs = list.entries.map((e) => e.collectionSlug).filter((a) => a !== null);

  if (slugs.length === 0) return [];

  const foundCollections = await indexer
    .select({
      slug: collections.slug,
      season: collections.season,
      collectionNo: collections.collectionNo,
      member: collections.member,
      artist: collections.artist,
      collectionId: collections.collectionId,
      class: collections.class,
    })
    .from(collections)
    .where(inArray(collections.slug, slugs));

  const slugToCollection = new Map(foundCollections.map((c) => [c.slug, c]));

  return list.entries
    .filter((e) => e.collectionSlug !== null)
    .map((e) => {
      const collection = slugToCollection.get(e.collectionSlug!);
      return collection ?? null;
    })
    .filter((a) => a !== null);
}
