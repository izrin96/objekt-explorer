import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, userAddress } from "@repo/db/schema";
import type { UserAddress } from "@repo/db/schema";
import { overrideCollection } from "@repo/lib/server/objekt";
import { type AnyColumn, and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { OBJEKT_PREVIEW_SIZE } from "../../constants";
import { isMessageable, toMessagePref } from "../../lib/chat-rules";
import { refuse } from "../../lib/refuse";
import {
  DEFAULT_OPEN_TO,
  listStateOf,
  type PostOpenTo,
  type PostRow,
  type SideList,
} from "../../lib/trade-post-state";
import { normalizeUserText } from "../../schemas/common/user-text";
import { needsTradeHandle, type ListPreview, type PublicList } from "../../schemas/list";
import { tradeHandle } from "../../schemas/trade-person";
import { messageBarred } from "../moderation/safety";
import { getCollectionColumns } from "../objekt/collection-columns";
import { toPublicUser } from "../profile";
import { fetchAddresses } from "../trade/matches/holdings";
import { fetchCollectionsBySlug } from "./collections";

export async function fetchListWithEntries(lookup: ListLookup) {
  return db.query.lists.findFirst({
    with: {
      entries: {
        // a rule's entries show as the rule, never in the grid
        where: { ruleId: { isNull: true } },
        orderBy: { id: "asc" },
      },
    },
    where: listWhere(lookup),
  });
}

function toPartialProfile(profile: Pick<UserAddress, "address" | "nickname">) {
  return { address: profile.address, nickname: profile.nickname || null };
}

async function ownerTradeHandle(userId: string | null | undefined) {
  return userId ? tradeHandle(await fetchAddresses([userId])) : null;
}

const ownerAddress = { columns: { address: true, nickname: true } } as const;

/** A `trade_post` row's columns as `PostRow` holds them, for `listStateOf`. */
const postRowColumns = {
  columns: {
    id: true,
    leadListId: true,
    wantListId: true,
    leadOnTrade: true,
    wantOnTrade: true,
    leadBumpedAt: true,
    wantBumpedAt: true,
    matchHave: true,
    matchSale: true,
    takesSwaps: true,
  },
  orderBy: { id: "asc" },
} as const;

/** Every row a list leads or is the want list of, lowest first. */
const listRowsWith = { postLed: postRowColumns, postWanted: postRowColumns } as const;

type ListRows = { postLed: PostRow[]; postWanted: PostRow[] };

/**
 * A list object's `matchSale`, `matchHave` and `takesSwaps`: what its posts are open to, by
 * `listStateOf` over every row it is in, so they follow its posts on Trade, else all its posts,
 * else the defaults.
 */
const openToOfRows = (list: SideList, { postLed, postWanted }: ListRows) =>
  listStateOf([...postLed, ...postWanted], list);

/** The linked half of a pair, partial: its link, and what the header's post tags read. */
const linkedListColumns = {
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
  },
  with: { userAddress: ownerAddress },
} as const;

/** {@link linkedListColumns} with the partner's own rows, for a read that lacks them. */
const linkedListWith = {
  ...linkedListColumns,
  with: { ...linkedListColumns.with, ...listRowsWith },
} as const;

type LinkedRow<T> = T & { userAddress: Pick<UserAddress, "address" | "nickname"> | null };

/** The partner as a list object, with the Open to its posts give it. */
function toLinkedList<T extends SideList>(
  { userAddress: owner, ...linked }: LinkedRow<T>,
  openTo: PostOpenTo,
) {
  return { ...linked, ...openTo, profile: owner ? toPartialProfile(owner) : null };
}

// the rows stay out of the result, which `user.currentUser` returns with no output schema
function toLinkedListByRows<T extends SideList>({
  postLed,
  postWanted,
  ...linked
}: LinkedRow<T> & ListRows) {
  return toLinkedList(linked, openToOfRows(linked, { postLed, postWanted }));
}

type ListLookup = { slug: string } | { profileSlug: string; profileAddress: string };

function listWhere(lookup: ListLookup) {
  return "profileAddress" in lookup
    ? { profileSlug: lookup.profileSlug, profileAddress: lookup.profileAddress.toLowerCase() }
    : { slug: lookup.slug };
}

/**
 * A list's rows, each with its other list: the pair is a lead's want list, or a want list's lead,
 * from the lowest row, as `postPartnerSql` gives it; every row gives the list its Open to.
 */
const pairWith = {
  postLed: { ...postRowColumns, with: { wantList: linkedListWith } },
  postWanted: { ...postRowColumns, with: { leadList: linkedListWith } },
} as const;

/** {@link pairWith} for a read that holds every list of the partner's owner already. */
const ownPairWith = {
  postLed: { ...postRowColumns, with: { wantList: linkedListColumns } },
  postWanted: { ...postRowColumns, with: { leadList: linkedListColumns } },
} as const;

type PairRow<L> = {
  postLed: { wantList: L | null }[];
  postWanted: { leadList: L | null }[];
};

const pairedListOf = <L>(row: PairRow<L>) =>
  row.postLed[0]?.wantList ?? row.postWanted[0]?.leadList ?? null;

const listWith = { userAddress: ownerAddress, ...pairWith } as const;

function readList(lookup: ListLookup) {
  return db.query.lists.findFirst({
    with: { ...listWith, user: true },
    where: listWhere(lookup),
  });
}

/** `readList` with the owner's message setting, which only the list page's Message button reads. */
function readListForViewer(lookup: ListLookup) {
  return db.query.lists.findFirst({
    with: { ...listWith, user: { with: { messagePref: { columns: { allow: true } } } } },
    where: listWhere(lookup),
  });
}

type ListRow = NonNullable<Awaited<ReturnType<typeof readList>>>;
type ViewerListRow = NonNullable<Awaited<ReturnType<typeof readListForViewer>>>;

function listTradeHandle(row: ListRow) {
  return needsTradeHandle({ ...row, linkedList: pairedListOf(row) })
    ? ownerTradeHandle(row.userId)
    : null;
}

function toPublicList(result: ListRow, handle: PublicList["tradeHandle"]): PublicList {
  const linked = pairedListOf(result);
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
    ...openToOfRows(result, result),
    ratio: result.ratio,
    user: result.user ? toPublicUser(result.user) : null,
    profile: result.userAddress ? toPartialProfile(result.userAddress) : null,
    description: result.description ? normalizeUserText(result.description) : null,
    tradeHandle: handle,
    linkedList: linked ? toLinkedListByRows(linked) : null,
  };
}

export async function fetchList(lookup: ListLookup): Promise<PublicList | null> {
  const row = await readList(lookup);
  return row ? toPublicList(row, await listTradeHandle(row)) : null;
}

/** Whether the list page offers Message to the viewer: never on their own list, nor a blocked pair. */
async function offersMessage(row: ViewerListRow, viewerId: string | undefined) {
  if (row.userId === viewerId) return false;
  if (!isMessageable(toMessagePref(row.user?.messagePref))) return false;
  return !(await messageBarred(viewerId, row.userId));
}

/** The list page's read: the list, and whether it offers Message to this viewer. */
export async function fetchListForViewer(lookup: ListLookup, viewerId: string | undefined) {
  const row = await readListForViewer(lookup);
  if (!row) return null;
  const [handle, messageable] = await Promise.all([
    listTradeHandle(row),
    offersMessage(row, viewerId),
  ]);
  return { ...toPublicList(row, handle), messageable };
}

/**
 * The lists under a profile: those of the account holding the address now. One that unlinked it,
 * or lost it to a staff move, keeps its rows but no longer shows under the profile.
 */
function heldProfileLists(profileAddress: string) {
  return {
    profileAddress,
    RAW: (list: { profileAddress: AnyColumn; userId: AnyColumn }) => sql`EXISTS (
      SELECT 1 FROM ${userAddress}
      WHERE ${userAddress.address} = ${list.profileAddress}
        AND ${userAddress.userId} = ${list.userId}
    )`,
  };
}

const ownedListColumns = {
  id: true,
  slug: true,
  name: true,
  listType: true,
  isProfileBind: true,
  profileSlug: true,
  profileAddress: true,
  currency: true,
  discoverable: true,
} as const;

type LinkedList = NonNullable<PublicList["linkedList"]>;

/** One of `fetchOwnedLists`' lists, its rows and owner taken out and its partner made already. */
function toOwnedList<
  T extends SideList & {
    profileAddress: string | null;
    isProfileBind: boolean;
    discoverable: boolean;
  },
>(
  list: T,
  rows: ListRows,
  owner: Pick<UserAddress, "address" | "nickname"> | null,
  linkedList: LinkedList | null,
  handle: PublicList["tradeHandle"],
) {
  return {
    ...list,
    ...openToOfRows(list, rows),
    tradeHandle: needsTradeHandle({ ...list, linkedList }) ? handle : null,
    profile: owner ? toPartialProfile(owner) : null,
    linkedList,
  };
}

// `postLed` and `postWanted` stay out of the result: it is spread into the output, and
// `user.currentUser` has no output schema to strip them
export async function fetchOwnedLists(
  column: "userId" | "profileAddress",
  identifier: string,
): Promise<PublicList[]> {
  if (column === "profileAddress") {
    // a profile's lists carry its address, so none needs the handle; a partner can be a list
    // the profile does not show, so it brings its own rows
    const found = await db.query.lists.findMany({
      columns: ownedListColumns,
      where: heldProfileLists(identifier),
      with: { userAddress: ownerAddress, ...pairWith },
      orderBy: { id: "desc" },
    });
    return found.map(({ userAddress, postLed, postWanted, ...list }) => {
      const linked = pairedListOf({ postLed, postWanted });
      return toOwnedList(
        list,
        { postLed, postWanted },
        userAddress,
        linked ? toLinkedListByRows(linked) : null,
        null,
      );
    });
  }

  // a partner is one of the same owner's lists, so its Open to comes from rows read already
  const found = await db.query.lists.findMany({
    columns: ownedListColumns,
    where: { userId: identifier },
    with: { userAddress: ownerAddress, ...ownPairWith },
    orderBy: { id: "desc" },
  });
  const openToById = new Map(found.map((row) => [row.id, openToOfRows(row, row)]));
  const handle = found.some((row) => needsTradeHandle({ ...row, linkedList: pairedListOf(row) }))
    ? await ownerTradeHandle(identifier)
    : null;
  return found.map(({ userAddress, postLed, postWanted, ...list }) => {
    const linked = pairedListOf({ postLed, postWanted });
    return toOwnedList(
      list,
      { postLed, postWanted },
      userAddress,
      linked ? toLinkedList(linked, openToById.get(linked.id) ?? DEFAULT_OPEN_TO) : null,
      handle,
    );
  });
}

export function fetchProfileLists(profileAddress: string): Promise<PublicList[]> {
  return fetchOwnedLists("profileAddress", profileAddress);
}

/** The previews of the lists `fetchProfileLists` returns, read beside it instead of after. */
export function fetchProfilePreviews(profileAddress: string): Promise<ListPreview[]> {
  return fetchListPreviews({ profileAddress });
}

/** Each list's entry count and its latest few artworks, newest first. */
export async function fetchListPreviews(
  source: string[] | { profileAddress: string },
): Promise<ListPreview[]> {
  if (Array.isArray(source) && source.length === 0) return [];
  const scope = Array.isArray(source)
    ? { slug: { in: source } }
    : heldProfileLists(source.profileAddress);

  // the list page reads only the column its binding uses, so the preview does too
  const readLists = (bound: boolean) => {
    const shown = bound ? isNotNull(listEntries.objektId) : isNotNull(listEntries.collectionSlug);
    return db.query.lists.findMany({
      columns: { slug: true },
      where: { ...scope, isProfileBind: bound },
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

/**
 * The caller's list, whole, with `linkedListId` its partner by its `trade_post` row, and the Open
 * to its posts give it (`openToOfRows`), which tabs from before still read from `list.find`.
 */
export async function findOwnedList(slug: string, userId: string) {
  const found = await db.query.lists.findFirst({
    where: { slug, userId },
    with: listRowsWith,
  });

  if (!found) throw new ORPCError("NOT_FOUND");

  // the rows stay out: `list.find` returns this as it is
  const { postLed, postWanted, ...list } = found;
  return {
    ...list,
    ...openToOfRows(list, { postLed, postWanted }),
    linkedListId: postLed[0]?.wantListId ?? postWanted[0]?.leadListId ?? null,
  };
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
