import { ORPCError } from "@orpc/server";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { lists, userAddress } from "@repo/db/schema";
import type { ListEntry, UserAddress } from "@repo/db/schema";
import { mapOwnedObjekt, overrideCollection } from "@repo/lib/server/objekt";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, eq, inArray, ne } from "drizzle-orm";
import slugify from "slugify";

import type { ListTypeNew, PublicList } from "../universal/list";
import { toPublicUser } from "./auth.server";
import { getCollectionColumns, getPartialCollectionColumns } from "./objekt.server";

export interface ListEntryTransformConfig {
  artists?: ValidArtist[];
  hideSerial?: boolean;
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
      if (!data) return null;
      const objekt = config?.hideSerial
        ? data.collection
        : mapOwnedObjekt(data.objekt, data.collection);
      return Object.assign({}, objekt, {
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
  isProfileBind: boolean,
  config?: ListEntryTransformConfig,
): Promise<ValidObjekt[]> {
  if (isProfileBind) {
    return buildProfileListEntries(entries, config);
  }
  return buildNormalListEntries(entries, config);
}

export async function fetchListWithEntries(slug: string) {
  return db.query.lists.findFirst({
    with: {
      entries: {
        orderBy: { id: "asc" },
      },
    },
    where: { slug },
  });
}

function toPartialProfile(profile: Pick<UserAddress, "address" | "nickname" | "hideNickname">) {
  return {
    address: profile.address,
    nickname: profile.hideNickname || !profile.nickname ? null : profile.nickname,
  };
}

export async function fetchList(slug: string, profileAddress?: string): Promise<PublicList | null> {
  const result = await db.query.lists.findFirst({
    // load full
    with: {
      user: true,
      linkedList: {
        columns: {
          // partial
          id: true,
          slug: true,
          name: true,
          listTypeNew: true,
          isProfileBind: true,
          profileSlug: true,
          profileAddress: true,
          currency: true,
        },
        with: {
          userAddress: {
            columns: {
              address: true,
              nickname: true,
              hideNickname: true,
            },
          },
        },
      },
    },
    where: profileAddress
      ? { profileSlug: slug, profileAddress: profileAddress.toLowerCase() }
      : { slug },
  });

  if (!result) return null;

  return {
    id: result.id,
    slug: result.slug,
    name: result.name,
    listTypeNew: result.listTypeNew,
    isProfileBind: result.isProfileBind,
    profileSlug: result.profileSlug,
    profileAddress: result.profileAddress,
    currency: result.currency,
    // extras
    hideSerial: result.hideSerial,
    gridColumns: result.gridColumns,
    user: result.hideUser || !result.user ? null : toPublicUser(result.user),
    description: result.description,
    linkedList: result.linkedList
      ? {
          ...result.linkedList,
          profile: result.linkedList.userAddress
            ? toPartialProfile(result.linkedList.userAddress)
            : null,
        }
      : null,
  };
}

export async function fetchOwnedLists(
  column: "userId" | "profileAddress",
  identifier: string,
): Promise<PublicList[]> {
  const result = await db.query.lists.findMany({
    columns: {
      // partial
      id: true,
      slug: true,
      name: true,
      listTypeNew: true,
      isProfileBind: true,
      profileSlug: true,
      profileAddress: true,
      currency: true,
    },
    where: {
      [column]: identifier,
    },
    with: {
      userAddress: {
        columns: {
          address: true,
          nickname: true,
          hideNickname: true,
        },
      },
    },
    orderBy: { id: "desc" },
  });

  return result.map(({ userAddress, ...rest }) => {
    return {
      ...rest,
      profile: userAddress ? toPartialProfile(userAddress) : null,
    };
  });
}

export async function checkLinkedList(type: ListTypeNew, linkedListId: number, userId: string) {
  const linkedList = await db.query.lists.findFirst({
    columns: {
      listTypeNew: true,
    },
    where: {
      id: linkedListId,
      userId: userId,
    },
  });

  if (!linkedList) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Linked list not found",
    });
  }

  // have can only link to want, want can only link to have
  if (type === "have" && linkedList.listTypeNew !== "want") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Have lists can only link to Want lists",
    });
  }
  if (type === "want" && linkedList.listTypeNew !== "have") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Want lists can only link to Have lists",
    });
  }
}

export async function checkProfileOwnership(address: string, userId: string): Promise<void> {
  const count = await db.$count(
    userAddress,
    and(eq(userAddress.address, address.toLowerCase()), eq(userAddress.userId, userId)),
  );

  if (count < 1) {
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

export async function findOwnedList(slug: string, userId: string) {
  const list = await db.query.lists.findFirst({
    where: { slug, userId },
  });

  if (!list) throw new ORPCError("NOT_FOUND");

  return list;
}

/**
 * Return only partial collection of list entry
 * Only used by Generate Discord Format for now
 */
export async function fetchPartialOwnedListCollections(slug: string, userId: string) {
  const list = await db.query.lists.findFirst({
    where: { slug, ...(userId ? { userId } : {}) },
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

  if (list.isProfileBind) {
    const objektIds = list.entries.map((e) => e.objektId).filter((a) => a !== null);

    if (objektIds.length === 0) return [];

    const objektsData = await indexer
      .select({
        id: objekts.id,
        collection: {
          ...getPartialCollectionColumns(),
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
      ...getPartialCollectionColumns(),
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
