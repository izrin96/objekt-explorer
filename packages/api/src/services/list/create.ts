import { ORPCError } from "@orpc/server";
import { db, type Tx } from "@repo/db";
import { lists } from "@repo/db/schema";
import { normalizeCurrency } from "@repo/lib/currency";
import { and, eq, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import type * as z from "zod";

import { pairRefusal, type PairRefusal } from "../../lib/list-pair";
import { profileSlugBase } from "../../lib/profile-slug";
import { refuse } from "../../lib/refuse";
import { canBeOnTrade, type createListInputSchema, type ListType } from "../../schemas/list";
import { type OpenToFlags, resolveOpenTo } from "../../schemas/open-to";
import { assertProfileOwned } from "../profile";
import { lockTradeLists, tradeColumns, turnOnBumpedAt } from "./shared";

export function resolveDiscoverable(
  type: ListType,
  isProfileBind: boolean,
  requested: boolean,
): boolean {
  return requested && canBeOnTrade(type, isProfileBind);
}

// English for tabs opened before a deploy and `/api/v1`; the web shows `refusalText`
const PAIR_MESSAGES: Record<PairRefusal, string> = {
  list_have_links_want: "Have lists can only link to Want lists",
  list_want_links_have: "Want lists can only link to Have lists",
  list_sale_links_sell_only: "Only a sale list open to swaps can be linked to a want list",
  list_pair_buying_only: "A want list linked to a have list can't be Buying only",
};

/**
 * The other list of a pair, checked for owner and type. A want list pairs with a have list, or
 * with a sale list that takes swaps (`takesSwaps` is the sale list's own when it is the one
 * linking). A pair can't be Buying only, so the want side's Open to is checked too: `openTo` is
 * what a want list is about to save, and a have or sale list reads its partner's.
 */
export async function checkLinkedList(
  type: ListType,
  linkedListId: number,
  userId: string,
  openTo: OpenToFlags,
  takesSwaps = false,
) {
  const linkedList = await db.query.lists.findFirst({
    columns: {
      listType: true,
      isProfileBind: true,
      matchSale: true,
      matchHave: true,
      takesSwaps: true,
    },
    where: {
      id: linkedListId,
      userId: userId,
    },
  });

  if (!linkedList) {
    refuse("BAD_REQUEST", "list_linked_not_found", "Linked list not found");
  }

  const reason = pairRefusal(type, { openTo, takesSwaps }, linkedList);
  if (reason) refuse("BAD_REQUEST", reason, PAIR_MESSAGES[reason]);
  return linkedList;
}

export async function generateProfileSlug(
  name: string,
  listSlug: string,
  profileAddress: string,
  excludeListId?: number,
  executor: Tx | typeof db = db,
): Promise<string> {
  const baseSlug = profileSlugBase(name);
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

export type NewList = z.infer<typeof createListInputSchema> & { gridColumns?: number | null };

/**
 * Validates a new list and settles its partner, before any transaction opens: these reads use
 * the pool, and a transaction waiting on them would hold a connection while it waits.
 */
export async function prepareList(input: NewList, userId: string) {
  const isProfileBind = ["have", "sale"].includes(input.listType) ? input.isProfileBind : false;

  const linkedListId = ["have", "want"].includes(input.listType) ? input.linkedListId : null;

  // Validate: sale lists require currency
  if (input.listType === "sale" && !input.currency) {
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
    linkedListId !== null
      ? checkLinkedList(input.listType, linkedListId, userId, resolveOpenTo(input.listType, input))
      : undefined,
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
    discoverable: resolveDiscoverable(input.listType, isProfileBind, input.discoverable),
  };
}

export type PreparedList = Awaited<ReturnType<typeof prepareList>>;

/** The one place a list row is created. Returns the ids to `touchList` once the transaction commits. */
export async function writeList(tx: Tx, prepared: PreparedList) {
  const { input, userId, slug, isProfileBind, linkedListId, discoverable } = prepared;
  // the partner checked in prepareList may have changed or gained a link since, so it is
  // checked again under the lock that list create and trade.savePost share
  let partner = prepared.partner;
  if (linkedListId !== null) {
    const locked = (await lockTradeLists(tx, userId)).find((list) => list.id === linkedListId);
    if (!locked) refuse("BAD_REQUEST", "list_linked_not_found", "Linked list not found");
    const reason = pairRefusal(
      input.listType,
      { openTo: resolveOpenTo(input.listType, input), takesSwaps: false },
      locked,
    );
    if (reason) refuse("BAD_REQUEST", reason, PAIR_MESSAGES[reason]);
    partner = locked;
  }
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
      listType: input.listType,
      isProfileBind,
      hideSerial:
        ["sale", "have"].includes(input.listType) && isProfileBind ? input.hideSerial : false,
      gridColumns: input.gridColumns,
      linkedListId,
      profileAddress: input.profileAddress ? input.profileAddress.toLowerCase() : null,
      description: input.description,
      currency:
        input.listType === "sale" && input.currency ? normalizeCurrency(input.currency) : null,
      discoverable,
      ...resolveOpenTo(input.listType, input),
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

    if (partner && resolveDiscoverable(partner.listType, partner.isProfileBind, discoverable)) {
      await tx.update(lists).set(tradeColumns(true)).where(eq(lists.id, linkedListId));
    }
  }

  return { id: inserted.id, slug, changed };
}
