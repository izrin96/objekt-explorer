import { ORPCError } from "@orpc/server";
import { toIndexedArtist, type ValidArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, messagePref } from "@repo/db/schema";
import type { List, ListEntry, UserAddress } from "@repo/db/schema";
import { chunkMap } from "@repo/lib";
import { touchListWith } from "@repo/lib/server/list-touch";
import { mapOwnedObjekt, overrideCollection } from "@repo/lib/server/objekt";
import type { ListEntryFields, ListObjekt } from "@repo/lib/types/objekt";
import { type SQL, and, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import slugify from "slugify";

import { OBJEKT_PREVIEW_SIZE } from "../constants";
import { isMessageable, toMessagePref } from "../lib/chat-rules";
import { BUMP_COOLDOWN_HOURS } from "../lib/trade-feed";
import {
  type AddSource,
  canBeOnTrade,
  type ListPreview,
  type ListTypeNew,
  type PublicList,
} from "../schemas/list";
import { isBlockedEither } from "./moderation";
import { getCollectionColumns, getPartialCollectionColumns } from "./objekt";
import { isProfileHidden } from "./privacy";
import { toPublicUser } from "./profile";
import { redis } from "./redis";
import { TOKEN_CHUNK_SIZE } from "./utils";

interface ListEntryTransformConfig {
  artists?: ValidArtist[];
  hideSerial?: boolean;
}

type EntryPick = Pick<
  ListEntry,
  "collectionSlug" | "objektId" | "id" | "price" | "isQyop" | "note"
>;

/** `id` stays unique when a list holds the same collection twice */
function entryFields(entry: EntryPick): ListEntryFields & { id: string } {
  return {
    id: entry.id.toString(),
    entryId: entry.id,
    price: entry.price,
    isQyop: entry.isQyop,
    note: entry.note,
  };
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
          ...(artists.length ? [inArray(collections.artist, artists.map(toIndexedArtist))] : []),
        ),
      ),
  );

  return result.map(overrideCollection);
}

async function buildProfileListEntries(
  entries: EntryPick[],
  config?: ListEntryTransformConfig,
): Promise<ListObjekt[]> {
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
            ? [inArray(collections.artist, config.artists.map(toIndexedArtist))]
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
      return Object.assign({}, objekt, entryFields(entry));
    })
    .filter((a) => a !== null);
}

async function buildNormalListEntries(
  entries: EntryPick[],
  config?: ListEntryTransformConfig,
): Promise<ListObjekt[]> {
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
      return Object.assign({}, collection, entryFields(entry));
    });
}

export async function buildListEntries(
  entries: EntryPick[],
  isProfileBind: boolean,
  config?: ListEntryTransformConfig,
): Promise<ListObjekt[]> {
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
    bumpedAt: result.bumpedAt,
    user: result.user ? toPublicUser(result.user) : null,
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

/** Whether the list page offers Message to the viewer: never on their own list, nor a blocked pair. */
export async function isListMessageable(listId: number, viewerId: string | undefined) {
  const [row] = await db
    .select({
      userId: lists.userId,
      allow: messagePref.allow,
    })
    .from(lists)
    .leftJoin(messagePref, eq(messagePref.userId, lists.userId))
    .where(eq(lists.id, listId));
  if (!row || row.userId === viewerId) return false;
  if (viewerId && (await isBlockedEither(viewerId, row.userId))) return false;
  return isMessageable(toMessagePref(row));
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
      discoverable: true,
      bumpedAt: true,
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
          userAddress: { columns: { address: true, nickname: true, hideNickname: true } },
        },
      },
    },
    orderBy: { id: "desc" },
  });

  // oxlint-disable-next-line oxc/no-map-spread
  return result.map(({ userAddress, linkedList, ...rest }) => {
    return {
      ...rest,
      profile: userAddress ? toPartialProfile(userAddress) : null,
      linkedList: linkedList
        ? {
            id: linkedList.id,
            slug: linkedList.slug,
            name: linkedList.name,
            listTypeNew: linkedList.listTypeNew,
            isProfileBind: linkedList.isProfileBind,
            profileSlug: linkedList.profileSlug,
            profileAddress: linkedList.profileAddress,
            currency: linkedList.currency,
            profile: linkedList.userAddress ? toPartialProfile(linkedList.userAddress) : null,
          }
        : null,
    };
  });
}

export async function fetchProfileLists(
  profileAddress: string,
  viewerId: string | undefined,
): Promise<PublicList[]> {
  const owner = await db.query.userAddress.findFirst({
    columns: { privateProfile: true, userId: true },
    where: { address: profileAddress },
  });

  if (owner && isProfileHidden(owner, viewerId)) return [];

  return fetchOwnedLists("profileAddress", profileAddress);
}

/** Each list's entry count and its latest few artworks, newest first. */
export async function fetchListPreviews(slugs: string[]): Promise<ListPreview[]> {
  if (slugs.length === 0) return [];

  // the list page reads only the column its binding uses, so the preview does too
  const readLists = (bound: boolean) => {
    const shown = bound ? isNotNull(listEntries.objektId) : isNotNull(listEntries.collectionSlug);
    return db.query.lists.findMany({
      columns: { slug: true },
      where: { slug: { in: slugs }, isProfileBind: bound },
      extras: {
        count: (list) => db.$count(listEntries, and(eq(listEntries.listId, list.id), shown)),
      },
      with: {
        entries: {
          columns: { collectionSlug: true, objektId: true },
          where: bound
            ? { objektId: { isNotNull: true } }
            : { collectionSlug: { isNotNull: true } },
          orderBy: { id: "desc" },
          limit: OBJEKT_PREVIEW_SIZE,
        },
      },
    });
  };

  const found = (await Promise.all([readLists(true), readLists(false)])).flat();
  const entries = found.flatMap((list) => list.entries);
  const collectionSlugs = entries.map((e) => e.collectionSlug).filter((s) => s !== null);
  const objektIds = entries.map((e) => e.objektId).filter((s) => s !== null);

  const [bySlug, byObjekt] = await Promise.all([
    fetchCollectionsBySlug(collectionSlugs, []),
    objektIds.length
      ? indexer
          .select({ objektId: objekts.id, collection: getCollectionColumns() })
          .from(objekts)
          .innerJoin(collections, eq(collections.id, objekts.collectionId))
          .where(inArray(objekts.id, objektIds))
      : [],
  ]);

  const slugMap = new Map(bySlug.map((c) => [c.slug, c]));
  const objektMap = new Map(byObjekt.map((o) => [o.objektId, overrideCollection(o.collection)]));

  return found.map((list) => ({
    slug: list.slug,
    count: list.count,
    objekts: list.entries
      .map((e) =>
        e.objektId
          ? objektMap.get(e.objektId)
          : e.collectionSlug
            ? slugMap.get(e.collectionSlug)
            : undefined,
      )
      .filter((objekt) => objekt !== undefined),
  }));
}

export function resolveDiscoverable(
  type: ListTypeNew,
  isProfileBind: boolean,
  requested: boolean,
): boolean {
  return requested && canBeOnTrade(type, isProfileBind);
}

const bumpCutoff = sql`now() - make_interval(hours => ${BUMP_COOLDOWN_HOURS})`;

/**
 * The bump time of the list linked to this one when that list is on Trade, so the two form
 * one post. `link` is the linked list id, or `lists.linked_list_id` of the row being updated.
 */
function partnerBumpedAt(link: SQL | number | null, type: SQL | ListTypeNew, userId: SQL | string) {
  if (link === null) return sql`NULL::timestamptz`;
  return sql`(
    SELECT p.bumped_at FROM lists p
    WHERE p.id = ${link} AND p.discoverable AND p.user_id = ${userId}
      AND p.list_type_new IN ('have', 'want') AND p.list_type_new <> ${type}
  )`;
}

/**
 * The bump time of a list turning Show on Trade on. It counts as a bump only once the post,
 * this list with its linked partner on Trade, is past the bump cooldown; within it the post
 * keeps its bump time, so turning Show on Trade off and on cannot stand in for Bump.
 */
function turnOnBumpedAt(own: SQL, partner: SQL) {
  return sql`CASE
    WHEN ${own} > ${bumpCutoff} THEN ${own}
    WHEN ${partner} > ${bumpCutoff} THEN ${partner}
    ELSE now()
  END`;
}

/** `bumpedAt` for a list created with Show on Trade on. */
export function createdBumpedAt(linkedListId: number | null, type: ListTypeNew, userId: string) {
  return turnOnBumpedAt(sql`NULL::timestamptz`, partnerBumpedAt(linkedListId, type, userId));
}

/**
 * The columns that put a list on or off Trade: turning it on from off counts as a bump. `link` is
 * the linked list id the write leaves in place (null for none); omitted, the stored one.
 */
export function tradeColumns(on: boolean, link?: number | null) {
  if (!on) return { discoverable: false };
  // raw names: inside the partner subquery a rendered column could bind to `p`
  const partner = partnerBumpedAt(
    link === undefined ? sql`lists.linked_list_id` : link,
    sql`lists.list_type_new`,
    sql`lists.user_id`,
  );
  return {
    discoverable: true,
    bumpedAt: sql<string | null>`CASE
      WHEN lists.discoverable THEN lists.bumped_at
      ELSE ${turnOnBumpedAt(sql`lists.bumped_at`, partner)}
    END`,
  };
}

export async function checkLinkedList(type: ListTypeNew, linkedListId: number, userId: string) {
  const linkedList = await db.query.lists.findFirst({
    columns: {
      listTypeNew: true,
      isProfileBind: true,
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
  return linkedList;
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

/** Every list or entry write calls this once committed, so idle ranking and the cached trade matches stay right. */
export function touchList(listIds: number[]) {
  return touchListWith(redis, listIds);
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
  if (rows.length > 0) await touchList([list.id]);
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
  const inserted = await db.transaction((tx) =>
    chunkMap(tokens, TOKEN_CHUNK_SIZE, (batch) =>
      tx
        .insert(listEntries)
        .values(batch.map((token) => ({ listId, objektId: token.id, collectionSlug: token.slug })))
        .onConflictDoNothing()
        .returning(),
    ),
  );
  if (inserted.length > 0) await touchList([listId]);
  return inserted;
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
