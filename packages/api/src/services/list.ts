import { ORPCError } from "@orpc/server";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, user, userAddress } from "@repo/db/schema";
import type { List, ListEntry, UserAddress } from "@repo/db/schema";
import { chunkMap } from "@repo/lib";
import { mapOwnedObjekt, overrideCollection } from "@repo/lib/server/objekt";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import slugify from "slugify";

import type { AddSource, ListTypeNew, PublicList } from "../schemas/list";
import { toPublicUser } from "./auth";
import { getCollectionColumns, getPartialCollectionColumns } from "./objekt";
import { TOKEN_CHUNK_SIZE } from "./utils";

export interface ListEntryTransformConfig {
  artists?: ValidArtist[];
  hideSerial?: boolean;
}

export async function fetchCollectionsBySlug(slugs: string[], artists: ValidArtist[]) {
  const uniqueSlugs = new Set(slugs);

  if (uniqueSlugs.size === 0) return [];

  const result = await chunkMap(Array.from(uniqueSlugs), TOKEN_CHUNK_SIZE, (batch) =>
    indexer
      .select({
        ...getCollectionColumns(),
      })
      .from(collections)
      .where(
        and(
          inArray(collections.slug, batch),
          ...(artists.length
            ? [
                inArray(
                  collections.artist,
                  artists.map((a) => a.toLowerCase()),
                ),
              ]
            : []),
        ),
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

  const objektsData = await chunkMap(objektIds, TOKEN_CHUNK_SIZE, (batch) =>
    indexer
      .select({
        objekt: objekts,
        collection: getCollectionColumns(),
      })
      .from(objekts)
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(
        and(
          inArray(objekts.id, batch),
          ...(config?.artists?.length
            ? [
                inArray(
                  collections.artist,
                  config.artists.map((a) => a.toLowerCase()),
                ),
              ]
            : []),
        ),
      ),
  );

  const objektMap = new Map(objektsData.map((o) => [o.objekt.id, o]));

  return entries
    .filter((e) => e.objektId !== null)
    .map((entry) => {
      const data = objektMap.get(entry.objektId!);
      if (!data) return null;
      const objekt = config?.hideSerial
        ? overrideCollection(data.collection)
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

export async function fetchList(
  lookup: { slug: string } | { profileSlug: string; profileAddress: string },
): Promise<PublicList | null> {
  const result = await db.query.lists.findFirst({
    // load full
    with: {
      user: true,
      userAddress: {
        columns: {
          address: true,
          nickname: true,
          hideNickname: true,
        },
      },
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
    where:
      "profileAddress" in lookup
        ? { profileSlug: lookup.profileSlug, profileAddress: lookup.profileAddress.toLowerCase() }
        : { slug: lookup.slug },
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
    discoverable: result.discoverable,
    user: result.hideUser || !result.user ? null : toPublicUser(result.user),
    profile: result.userAddress ? toPartialProfile(result.userAddress) : null,
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

  // oxlint-disable-next-line oxc/no-map-spread
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

export async function generateProfileSlug(
  name: string,
  listSlug: string,
  profileAddress: string,
  excludeListId?: number,
): Promise<string> {
  // profile_slug is varchar(100); leave room for the "-<counter>" suffix
  const baseSlug = slugify(name, { lower: true, strict: true }).slice(0, 90).replace(/-+$/, "");
  let slug = baseSlug || listSlug;
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

type AddableList = Pick<List, "id" | "isProfileBind" | "profileAddress">;

/** `skipped` counts the requested items that added nothing. */
export async function addEntries(
  list: AddableList,
  from: AddSource,
  skipDups: boolean,
): Promise<{ rows: ListEntry[]; skipped: number }> {
  const owner = list.isProfileBind ? list.profileAddress?.toLowerCase() : undefined;

  if (owner) {
    if (from.type === "collections") {
      const slugs = Array.from(new Set(from.slugs));
      const copies = await chunkMap(slugs, TOKEN_CHUNK_SIZE, (batch) =>
        indexer
          .select({ id: objekts.id, slug: collections.slug, serial: objekts.serial })
          .from(objekts)
          .innerJoin(collections, eq(collections.id, objekts.collectionId))
          .where(and(inArray(collections.slug, batch), eq(objekts.owner, owner))),
      );
      const order = new Map(slugs.map((slug, i) => [slug, i]));
      const rows = await insertTokens(
        list.id,
        copies.toSorted((a, b) => order.get(a.slug)! - order.get(b.slug)! || a.serial - b.serial),
      );
      const added = new Set(rows.map((row) => row.collectionSlug));
      return { rows, skipped: slugs.filter((slug) => !added.has(slug)).length };
    }

    const tokenIds =
      from.type === "list" ? await resolveEntryTokens(from.slug, from.entryIds) : from.tokenIds;
    const requested = from.type === "list" ? from.entryIds.length : from.tokenIds.length;
    const unique = Array.from(new Set(tokenIds));

    const found = await chunkMap(unique, TOKEN_CHUNK_SIZE, (batch) =>
      indexer
        .select({ id: objekts.id, owner: objekts.owner, slug: collections.slug })
        .from(objekts)
        .innerJoin(collections, eq(collections.id, objekts.collectionId))
        .where(inArray(objekts.id, batch)),
    );
    const owned = new Map(found.filter((o) => o.owner === owner).map((o) => [o.id, o]));
    const rows = await insertTokens(
      list.id,
      unique.flatMap((id) => owned.get(id) ?? []),
    );
    return { rows, skipped: requested - rows.length };
  }

  if (from.type !== "collections") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Collections required for non-profile-bound lists",
    });
  }

  let slugs = from.slugs;
  if (skipDups) {
    const existing = await db
      .selectDistinct({ slug: listEntries.collectionSlug })
      .from(listEntries)
      .where(eq(listEntries.listId, list.id));
    const existingSlugs = new Set(existing.map((entry) => entry.slug));
    slugs = Array.from(new Set(from.slugs)).filter((slug) => !existingSlugs.has(slug));
  }

  const rows =
    slugs.length === 0
      ? []
      : await db.transaction((tx) =>
          chunkMap(slugs, TOKEN_CHUNK_SIZE, (batch) =>
            tx
              .insert(listEntries)
              .values(batch.map((collectionSlug) => ({ listId: list.id, collectionSlug })))
              .returning(),
          ),
        );
  return { rows, skipped: from.slugs.length - rows.length };
}

/** Only entries of that one list resolve, and only those holding a token. */
async function resolveEntryTokens(slug: string, entryIds: number[]) {
  const source = await db.query.lists.findFirst({ columns: { id: true }, where: { slug } });
  if (!source) return [];

  const entries = await chunkMap(entryIds, TOKEN_CHUNK_SIZE, (batch) =>
    db
      .select({ objektId: listEntries.objektId })
      .from(listEntries)
      .where(
        and(
          eq(listEntries.listId, source.id),
          inArray(listEntries.id, batch),
          isNotNull(listEntries.objektId),
        ),
      ),
  );
  return entries.flatMap((entry) => (entry.objektId ? [entry.objektId] : []));
}

async function insertTokens(listId: number, tokens: { id: string; slug: string }[]) {
  if (tokens.length === 0) return [];
  return db.transaction((tx) =>
    chunkMap(tokens, TOKEN_CHUNK_SIZE, (batch) =>
      tx
        .insert(listEntries)
        .values(batch.map((token) => ({ listId, objektId: token.id, collectionSlug: token.slug })))
        .onConflictDoNothing()
        .returning(),
    ),
  );
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

    const objektsData = await chunkMap(objektIds, TOKEN_CHUNK_SIZE, (batch) =>
      indexer
        .select({
          id: objekts.id,
          collection: {
            ...getPartialCollectionColumns(),
          },
        })
        .from(objekts)
        .innerJoin(collections, eq(collections.id, objekts.collectionId))
        .where(inArray(objekts.id, batch)),
    );

    const objektToCollection = new Map(objektsData.map((o) => [o.id, o.collection]));

    return list.entries
      .filter((e) => e.objektId !== null)
      .map((e) => {
        const collection = objektToCollection.get(e.objektId!);
        return collection ?? null;
      })
      .filter((a) => a !== null);
  }

  const slugs = [...new Set(list.entries.map((e) => e.collectionSlug).filter((a) => a !== null))];

  if (slugs.length === 0) return [];

  const foundCollections = await chunkMap(slugs, TOKEN_CHUNK_SIZE, (batch) =>
    indexer
      .select({
        ...getPartialCollectionColumns(),
      })
      .from(collections)
      .where(inArray(collections.slug, batch)),
  );

  const slugToCollection = new Map(foundCollections.map((c) => [c.slug, c]));

  return list.entries
    .filter((e) => e.collectionSlug !== null)
    .map((e) => {
      const collection = slugToCollection.get(e.collectionSlug!);
      return collection ?? null;
    })
    .filter((a) => a !== null);
}

export type PartnerRow = {
  userId: string;
  listId: number;
  listSlug: string;
  listName: string;
  profileAddress: string | null;
  profileSlug: string | null;
  theyHaveIWant: string[];
  iHaveTheyWant: string[];
};

export async function buildTradePartnersResponse(
  partners: PartnerRow[],
  sortField: "theyHaveIWant" | "iHaveTheyWant",
) {
  if (partners.length === 0) {
    return { partners: [], collections: {} };
  }

  const userIds = [...new Set(partners.map((r) => r.userId))];
  const allSlugs = [...new Set(partners.flatMap((r) => [...r.theyHaveIWant, ...r.iHaveTheyWant]))];

  const [users, userAddrs, collectionRows] = await Promise.all([
    db.select().from(user).where(inArray(user.id, userIds)),
    db.select().from(userAddress).where(inArray(userAddress.userId, userIds)),
    allSlugs.length > 0
      ? indexer.select().from(collections).where(inArray(collections.slug, allSlugs))
      : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const collectionsData = Object.fromEntries(collectionRows.map((c) => [c.slug, c]));

  // address → nickname map (hiding respected, addresses normalized to lowercase)
  const addrNickMap = new Map<string, string>();
  for (const addr of userAddrs) {
    if (addr.nickname && !addr.hideNickname) {
      addrNickMap.set(addr.address.toLowerCase(), addr.nickname);
    }
  }

  const order: string[] = [];
  const matchesByUser = new Map<string, PartnerRow[]>();
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
      const usr = userMap.get(userId);
      if (!usr) return null;
      const matches = matchesByUser.get(userId) ?? [];

      return {
        userId,
        username: usr.name ?? "unknown",
        user: toPublicUser(usr),
        matches: matches.map((m) => ({
          listId: m.listId,
          listSlug: m.listSlug,
          listName: m.listName,
          profileAddress: m.profileAddress,
          profileSlug: m.profileSlug,
          profileNickname: m.profileAddress
            ? (addrNickMap.get(m.profileAddress.toLowerCase()) ?? null)
            : null,
          theyHaveIWant: m.theyHaveIWant,
          iHaveTheyWant: m.iHaveTheyWant,
        })),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  tradePartners.sort((a, b) => {
    const aTotal = new Set(a.matches.flatMap((m) => m[sortField])).size;
    const bTotal = new Set(b.matches.flatMap((m) => m[sortField])).size;
    return bTotal - aTotal;
  });

  return { partners: tradePartners, collections: collectionsData };
}
