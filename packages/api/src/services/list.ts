import { ORPCError } from "@orpc/server";
import { toIndexedArtist, type ValidArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, messagePref } from "@repo/db/schema";
import type { List, ListEntry, UserAddress } from "@repo/db/schema";
import { chunkMap } from "@repo/lib";
import { normalizeCurrency } from "@repo/lib/currency";
import { touchListWith } from "@repo/lib/server/list-touch";
import { mapOwnedObjekt, overrideCollection } from "@repo/lib/server/objekt";
import type { ListEntryFields, ListObjekt } from "@repo/lib/types/objekt";
import { type SQL, and, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import slugify from "slugify";
import type * as z from "zod";

import { OBJEKT_PREVIEW_SIZE } from "../constants";
import { isMessageable, toMessagePref } from "../lib/chat-rules";
import { buildCopyRows, type CopyRow, type OwnedCopy } from "../lib/list-copy";
import { refuse } from "../lib/refuse";
import { BUMP_COOLDOWN_HOURS } from "../lib/trade-feed";
import {
  type AddSource,
  canBeOnTrade,
  type copyPreviewInputSchema,
  type createListInputSchema,
  type ListPreview,
  type ListTypeNew,
  type PublicList,
} from "../schemas/list";
import { carriesPrices, copyMode, copyUnit, needsHoldings } from "../schemas/list-copy";
import { resolveOpenTo } from "../schemas/open-to";
import { isBlockedEither, type Tx } from "./moderation";
import { getCollectionColumns, getPartialCollectionColumns } from "./objekt";
import { isProfileHidden } from "./privacy";
import { assertProfileOwned, toPublicUser } from "./profile";
import { redis } from "./redis";
import { isBanned } from "./safety";
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
    matchSale: result.matchSale,
    matchHave: result.matchHave,
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
  if (await isBanned(row.userId)) return false;
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
      matchSale: true,
      matchHave: true,
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
 * A person's last bump: the latest bump of any of their lists, on Trade or not, so turning a list
 * off and on, or posting a new one, cannot stand in for Bump.
 */
function personBumpedAt(userId: SQL | string) {
  return sql`(SELECT max(p.bumped_at) FROM lists p WHERE p.user_id = ${userId})`;
}

/**
 * The bump time of a list turning Show on Trade on, or created with it on: a bump of its own,
 * unless its owner bumped in the last 24 hours, in which case it takes that bump's time.
 */
export function turnOnBumpedAt(userId: SQL | string) {
  const last = personBumpedAt(userId);
  return sql`CASE WHEN ${last} > ${bumpCutoff} THEN ${last} ELSE now() END`;
}

/** The columns that put a list on or off Trade: turning it on from off counts as a bump. */
export function tradeColumns(on: boolean) {
  if (!on) return { discoverable: false };
  return {
    discoverable: true,
    // raw name: inside the subquery a rendered column could bind to `p`
    bumpedAt: sql<string | null>`CASE
      WHEN lists.discoverable THEN lists.bumped_at
      ELSE ${turnOnBumpedAt(sql`lists.user_id`)}
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
    refuse("BAD_REQUEST", "list_linked_not_found", "Linked list not found");
  }

  // have can only link to want, want can only link to have
  if (type === "have" && linkedList.listTypeNew !== "want") {
    refuse("BAD_REQUEST", "list_have_links_want", "Have lists can only link to Want lists");
  }
  if (type === "want" && linkedList.listTypeNew !== "have") {
    refuse("BAD_REQUEST", "list_want_links_have", "Want lists can only link to Have lists");
  }
  return linkedList;
}

export async function generateProfileSlug(
  name: string,
  listSlug: string,
  profileAddress: string,
  excludeListId?: number,
  executor: Tx | typeof db = db,
): Promise<string> {
  // profile_slug is varchar(100); leave room for the "-<counter>" suffix
  const baseSlug = slugify(name, { lower: true, strict: true }).slice(0, 90).replace(/-+$/, "");
  let slug = baseSlug || listSlug;
  let counter = 2;

  while (true) {
    const existing = await executor
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

export type NewList = z.infer<typeof createListInputSchema> & { gridColumns?: number | null };

/**
 * Validates a new list and settles its partner, before any transaction opens: these reads use
 * the pool, and a transaction waiting on them would hold a connection while it waits.
 */
export async function prepareList(input: NewList, userId: string) {
  const isProfileBind = ["have", "sale"].includes(input.listTypeNew) ? input.isProfileBind : false;

  const linkedListId = ["have", "want"].includes(input.listTypeNew) ? input.linkedListId : null;

  // Validate: sale lists require currency
  if (input.listTypeNew === "sale" && !input.currency) {
    refuse("BAD_REQUEST", "list_currency_required", "Currency is required for sale lists");
  }

  // Validate: profile binding requires profile address
  if (isProfileBind && !input.profileAddress) {
    refuse(
      "BAD_REQUEST",
      "list_profile_required",
      "Profile address is required for profile-bound lists",
    );
  }

  // Validate profile ownership and linked list ownership + type compatibility.
  // allSettled keeps the profile error taking precedence over the linked one.
  const [profileCheck, linkedCheck] = await Promise.allSettled([
    input.profileAddress ? assertProfileOwned(input.profileAddress, userId) : undefined,
    linkedListId !== null ? checkLinkedList(input.listTypeNew, linkedListId, userId) : undefined,
  ]);

  if (profileCheck.status === "rejected") throw profileCheck.reason;
  if (linkedCheck.status === "rejected") throw linkedCheck.reason;

  return {
    input,
    userId,
    slug: nanoid(9),
    isProfileBind,
    linkedListId,
    partner: linkedCheck.value,
    discoverable: resolveDiscoverable(input.listTypeNew, isProfileBind, input.discoverable),
  };
}

export type PreparedList = Awaited<ReturnType<typeof prepareList>>;

/** The one place a list row is created. Returns the ids to `touchList` once the transaction commits. */
export async function writeList(tx: Tx, prepared: PreparedList) {
  const { input, userId, slug, isProfileBind, linkedListId, partner, discoverable } = prepared;
  // picked right before the insert, on the transaction's own connection, so the gap in which
  // two lists can pick the same profile slug stays as short as the insert itself
  const profileSlug = input.profileAddress
    ? await generateProfileSlug(input.name, slug, input.profileAddress.toLowerCase(), undefined, tx)
    : null;

  const [inserted] = await tx
    .insert(lists)
    .values({
      name: input.name,
      userId,
      slug,
      profileSlug,
      listTypeNew: input.listTypeNew,
      isProfileBind,
      hideSerial:
        ["sale", "have"].includes(input.listTypeNew) && isProfileBind ? input.hideSerial : false,
      gridColumns: input.gridColumns,
      linkedListId,
      profileAddress: input.profileAddress ? input.profileAddress.toLowerCase() : null,
      description: input.description,
      currency:
        input.listTypeNew === "sale" && input.currency ? normalizeCurrency(input.currency) : null,
      discoverable,
      ...resolveOpenTo(input.listTypeNew, input),
      bumpedAt: discoverable ? turnOnBumpedAt(userId) : null,
    })
    .returning({ id: lists.id });

  if (!inserted) throw new ORPCError("INTERNAL_SERVER_ERROR");
  const changed = [inserted.id];

  // Bidirectional link: clear any existing reverse link on target, then set new one
  if (linkedListId !== null) {
    const unlinked = await tx
      .update(lists)
      .set({ linkedListId: null })
      .where(and(eq(lists.linkedListId, linkedListId), ne(lists.id, inserted.id)))
      .returning({ id: lists.id });
    changed.push(linkedListId, ...unlinked.map((row) => row.id));

    await tx.update(lists).set({ linkedListId: inserted.id }).where(eq(lists.id, linkedListId));

    if (partner && resolveDiscoverable(partner.listTypeNew, partner.isProfileBind, discoverable)) {
      await tx.update(lists).set(tradeColumns(true)).where(eq(lists.id, linkedListId));
    }
  }

  return { id: inserted.id, slug, changed };
}

type CopyTarget = Pick<
  z.infer<typeof copyPreviewInputSchema>,
  "listTypeNew" | "isProfileBind" | "profileAddress"
>;

/**
 * What a copy of `source` would hold under `target`'s binding, read but not written.
 * A bound target's profile is checked before its holdings are read.
 */
export async function planCopy(source: List, target: CopyTarget, userId: string) {
  const isProfileBind = ["have", "sale"].includes(target.listTypeNew) && target.isProfileBind;
  const binding = { ...target, isProfileBind };
  const mode = copyMode(source, binding);

  const entries = await db
    .select({
      collectionSlug: listEntries.collectionSlug,
      objektId: listEntries.objektId,
      price: listEntries.price,
      isQyop: listEntries.isQyop,
      note: listEntries.note,
    })
    .from(listEntries)
    .where(eq(listEntries.listId, source.id))
    .orderBy(listEntries.id);

  let owned: ReadonlySet<string> | ReadonlyMap<string, OwnedCopy[]> = new Set<string>();
  if (needsHoldings(mode)) {
    if (!target.profileAddress) {
      refuse(
        "BAD_REQUEST",
        "list_profile_required",
        "Profile address is required for profile-bound lists",
      );
    }
    await assertProfileOwned(target.profileAddress, userId);
    const owner = target.profileAddress.toLowerCase();

    if (mode === "tokens") {
      const ids = Array.from(new Set(entries.flatMap((entry) => entry.objektId ?? [])));
      const found = await chunkMap(ids, TOKEN_CHUNK_SIZE, (batch) =>
        indexer
          .select({ id: objekts.id })
          .from(objekts)
          .where(and(inArray(objekts.id, batch), eq(objekts.owner, owner))),
      );
      owned = new Set(found.map((row) => row.id));
    } else {
      const slugs = Array.from(new Set(entries.flatMap((entry) => entry.collectionSlug ?? [])));
      const copies = await chunkMap(slugs, TOKEN_CHUNK_SIZE, (batch) =>
        indexer
          .select({ id: objekts.id, slug: collections.slug, serial: objekts.serial })
          .from(objekts)
          .innerJoin(collections, eq(collections.id, objekts.collectionId))
          .where(and(inArray(collections.slug, batch), eq(objekts.owner, owner))),
      );
      const bySlug = new Map<string, OwnedCopy[]>();
      for (const copy of copies) {
        const held = bySlug.get(copy.slug);
        if (held) held.push(copy);
        else bySlug.set(copy.slug, [copy]);
      }
      owned = bySlug;
    }
  }

  const plan = buildCopyRows(
    mode,
    entries,
    owned,
    carriesPrices(source.listTypeNew, target.listTypeNew),
  );
  return { ...plan, unit: copyUnit(mode) };
}

/** Inserts planned rows into a list in chunks. */
export async function insertCopyRows(tx: Tx, listId: number, rows: CopyRow[]) {
  for (let i = 0; i < rows.length; i += TOKEN_CHUNK_SIZE) {
    await tx
      .insert(listEntries)
      // oxlint-disable-next-line oxc/no-map-spread
      .values(rows.slice(i, i + TOKEN_CHUNK_SIZE).map((row) => ({ listId, ...row })))
      .onConflictDoNothing();
  }
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
    refuse(
      "BAD_REQUEST",
      "list_collections_required",
      "Collections required for non-profile-bound lists",
    );
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
