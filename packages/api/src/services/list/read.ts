import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, userAddress } from "@repo/db/schema";
import type { UserAddress } from "@repo/db/schema";
import { overrideCollection } from "@repo/lib/server/objekt";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { OBJEKT_PREVIEW_SIZE } from "../../constants";
import { isMessageable, toMessagePref } from "../../lib/chat-rules";
import { refuse } from "../../lib/refuse";
import { normalizeUserText } from "../../schemas/common/user-text";
import { needsTradeHandle, type ListPreview, type PublicList } from "../../schemas/list";
import { tradeHandle } from "../../schemas/trade-person";
import { isBlockedEither } from "../moderation/core";
import { isBanned } from "../moderation/safety";
import { getCollectionColumns } from "../objekt/collection-columns";
import { toPublicUser } from "../profile";
import { fetchAddresses } from "../trade/matches/holdings";
import { fetchCollectionsBySlug } from "./collections";

export async function fetchListWithEntries(slug: string) {
  return db.query.lists.findFirst({
    with: {
      entries: {
        // a rule's entries show as the rule, never in the grid
        where: { ruleId: { isNull: true } },
        orderBy: { id: "asc" },
      },
    },
    where: { slug },
  });
}

function toPartialProfile(profile: Pick<UserAddress, "address" | "nickname">) {
  return { address: profile.address, nickname: profile.nickname || null };
}

async function ownerTradeHandle(userId: string | null | undefined) {
  return userId ? tradeHandle(await fetchAddresses([userId])) : null;
}

const ownerAddress = { columns: { address: true, nickname: true } } as const;

/** The linked half of a pair, partial: its link, and what the header's post tags read. */
const linkedListWith = {
  columns: {
    id: true,
    slug: true,
    name: true,
    listType: true,
    isProfileBind: true,
    profileSlug: true,
    profileAddress: true,
    currency: true,
    discoverable: true,
    matchSale: true,
    matchHave: true,
    takesSwaps: true,
  },
  with: { userAddress: ownerAddress },
} as const;

type ListLookup = { slug: string } | { profileSlug: string; profileAddress: string };

function readList(lookup: ListLookup) {
  return db.query.lists.findFirst({
    // load full
    with: {
      user: { with: { messagePref: { columns: { allow: true } } } },
      userAddress: ownerAddress,
      linkedList: linkedListWith,
    },
    where:
      "profileAddress" in lookup
        ? { profileSlug: lookup.profileSlug, profileAddress: lookup.profileAddress.toLowerCase() }
        : { slug: lookup.slug },
  });
}

type ListRow = NonNullable<Awaited<ReturnType<typeof readList>>>;

function listTradeHandle(row: ListRow) {
  return needsTradeHandle(row) ? ownerTradeHandle(row.userId) : null;
}

function toPublicList(result: ListRow, handle: PublicList["tradeHandle"]): PublicList {
  return {
    id: result.id,
    slug: result.slug,
    name: result.name,
    listType: result.listType,
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
    takesSwaps: result.takesSwaps,
    ratio: result.ratio,
    bumpedAt: result.bumpedAt,
    user: result.user ? toPublicUser(result.user) : null,
    profile: result.userAddress ? toPartialProfile(result.userAddress) : null,
    description: result.description ? normalizeUserText(result.description) : null,
    tradeHandle: handle,
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

export async function fetchList(lookup: ListLookup): Promise<PublicList | null> {
  const row = await readList(lookup);
  return row ? toPublicList(row, await listTradeHandle(row)) : null;
}

/** Whether the list page offers Message to the viewer: never on their own list, nor a blocked pair. */
async function offersMessage(row: ListRow, viewerId: string | undefined) {
  if (row.userId === viewerId) return false;
  if (!isMessageable(toMessagePref(row.user?.messagePref))) return false;
  const [blocked, ownerBanned] = await Promise.all([
    viewerId ? isBlockedEither(viewerId, row.userId) : false,
    isBanned(row.userId),
  ]);
  return !blocked && !ownerBanned;
}

/** The list page's read: the list, and whether it offers Message to this viewer. */
export async function fetchListForViewer(lookup: ListLookup, viewerId: string | undefined) {
  const row = await readList(lookup);
  if (!row) return null;
  const [handle, messageable] = await Promise.all([
    listTradeHandle(row),
    offersMessage(row, viewerId),
  ]);
  return { ...toPublicList(row, handle), messageable };
}

export async function fetchOwnedLists(
  column: "userId" | "profileAddress",
  identifier: string,
  ownerId?: string,
): Promise<PublicList[]> {
  const result = await db.query.lists.findMany({
    columns: {
      // partial
      id: true,
      slug: true,
      name: true,
      listType: true,
      isProfileBind: true,
      profileSlug: true,
      profileAddress: true,
      currency: true,
      discoverable: true,
      matchSale: true,
      matchHave: true,
      takesSwaps: true,
      bumpedAt: true,
    },
    where: {
      [column]: identifier,
      ...(ownerId === undefined ? {} : { userId: ownerId }),
    },
    with: {
      userAddress: ownerAddress,
      linkedList: linkedListWith,
    },
    orderBy: { id: "desc" },
  });

  // a profile's lists carry its address, so only an account's own can need the handle
  const owner = ownerId ?? (column === "userId" ? identifier : undefined);
  const handle = result.some(needsTradeHandle) ? await ownerTradeHandle(owner) : null;

  // oxlint-disable-next-line oxc/no-map-spread
  return result.map(({ userAddress, linkedList, ...rest }) => {
    return {
      ...rest,
      tradeHandle: needsTradeHandle({ ...rest, linkedList }) ? handle : null,
      profile: userAddress ? toPartialProfile(userAddress) : null,
      linkedList: linkedList
        ? {
            id: linkedList.id,
            slug: linkedList.slug,
            name: linkedList.name,
            listType: linkedList.listType,
            isProfileBind: linkedList.isProfileBind,
            profileSlug: linkedList.profileSlug,
            profileAddress: linkedList.profileAddress,
            currency: linkedList.currency,
            discoverable: linkedList.discoverable,
            matchSale: linkedList.matchSale,
            matchHave: linkedList.matchHave,
            takesSwaps: linkedList.takesSwaps,
            profile: linkedList.userAddress ? toPartialProfile(linkedList.userAddress) : null,
          }
        : null,
    };
  });
}

/**
 * Only the lists of the account holding the address now: one that unlinked it, or lost it to a
 * staff move, keeps its rows but no longer shows under the profile.
 */
export async function fetchProfileLists(profileAddress: string): Promise<PublicList[]> {
  const [holder] = await db
    .select({ userId: userAddress.userId })
    .from(userAddress)
    .where(eq(userAddress.address, profileAddress));
  if (!holder?.userId) return [];
  return fetchOwnedLists("profileAddress", profileAddress, holder.userId);
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
        count: (list) =>
          db.$count(
            listEntries,
            and(eq(listEntries.listId, list.id), shown, isNull(listEntries.ruleId)),
          ),
      },
      with: {
        entries: {
          columns: { collectionSlug: true, objektId: true },
          where: bound
            ? { objektId: { isNotNull: true }, ruleId: { isNull: true } }
            : { collectionSlug: { isNotNull: true }, ruleId: { isNull: true } },
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

export async function findOwnedList(slug: string, userId: string) {
  const list = await db.query.lists.findFirst({
    where: { slug, userId },
  });

  if (!list) throw new ORPCError("NOT_FOUND");

  return list;
}

/**
 * The caller's list, for a write of entries, prices or rules. A list bound to a Cosmo profile takes
 * them only while its owner still holds that address, or an account that lost it could keep
 * listing what the address holds now.
 */
export async function findHeldList(slug: string, userId: string) {
  const found = await db.query.lists.findFirst({
    where: { slug, userId },
    with: { userAddress: { columns: { userId: true } } },
  });

  if (!found) throw new ORPCError("NOT_FOUND");

  const { userAddress: holder, ...list } = found;
  if (list.isProfileBind && list.profileAddress && holder?.userId !== userId) {
    refuse("FORBIDDEN", "profile_not_linked", "This Cosmo is not linked with your account");
  }

  return list;
}
