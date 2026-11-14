import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { normalizeCurrency } from "@repo/lib/currency";
import { eq, sql } from "drizzle-orm";

import { refuse } from "../../lib/refuse";
import type { EditListInput } from "../../schemas/list";
import { type OpenToFlags, openToEdit, pairRefusesOpenTo } from "../../schemas/open-to";
import { takesRatio } from "../../schemas/trade-ratio";
import { bumpTradeVersions } from "../moderation/safety-cache";
import { assertProfileOwned } from "../profile";
import { generateProfileSlug, PAIR_MESSAGES } from "./create";
import { findOwnedList } from "./read";
import { lockTradeLists, syncPostRows, touchList } from "./shared";

/**
 * A want list's Open to as `list.edit` writes it. The UPDATE reads the row again: a list put on
 * Trade since it was read keeps its post's flags, and one linked since keeps its own rather than
 * become a Buying only pair. Both columns share one condition, so `lists_open_to_something` holds.
 */
function openToColumns(flags: OpenToFlags) {
  const keep = pairRefusesOpenTo(flags)
    ? sql`(${lists.discoverable} OR ${lists.linkedListId} IS NOT NULL)`
    : sql`${lists.discoverable}`;
  return {
    matchSale: sql<boolean>`CASE WHEN ${keep} THEN ${lists.matchSale} ELSE ${flags.matchSale}::boolean END`,
    matchHave: sql<boolean>`CASE WHEN ${keep} THEN ${lists.matchHave} ELSE ${flags.matchHave}::boolean END`,
  };
}

export async function editList(userId: string, input: EditListInput) {
  // the profile check counts only for an unbound list, so its refusal waits for the list
  const [found, profileCheck] = await Promise.allSettled([
    findOwnedList(input.slug, userId),
    input.profileAddress ? assertProfileOwned(input.profileAddress, userId) : undefined,
  ]);
  if (found.status === "rejected") throw found.reason;
  const list = found.value;

  // Validate currency for sale lists
  if (list.listType === "sale" && !input.currency) {
    refuse("BAD_REQUEST", "list_currency_required", "Currency is required for sale lists");
  }
  if (input.ratio != null && !takesRatio(list.listType)) {
    refuse("BAD_REQUEST", "list_ratio_list_type", "Only have and want lists take a ratio");
  }
  const openTo = openToEdit(list, input.openTo);
  if (openTo.action === "refuse") {
    refuse("BAD_REQUEST", "list_pair_buying_only", PAIR_MESSAGES.list_pair_buying_only);
  }

  // address changes are ignored on a bound list, so only an unbound one is checked
  if (!list.isProfileBind && profileCheck.status === "rejected") throw profileCheck.reason;

  let profileSlug: string | null = null;
  // For isProfileBind lists, the profileAddress is locked to the
  // original address — derive the slug from that, not from any
  // untrusted input the caller may have passed.
  const effectiveProfileAddress = list.isProfileBind ? list.profileAddress : input.profileAddress;
  if (effectiveProfileAddress) {
    const address = effectiveProfileAddress.toLowerCase();
    // Keep the existing slug unless the user opted to regenerate it or
    // the list moved to a different profile (slug uniqueness is per address).
    const keepSlug =
      !input.regenerateSlug &&
      list.profileSlug !== null &&
      list.profileAddress?.toLowerCase() === address;
    profileSlug = keepSlug
      ? list.profileSlug
      : await generateProfileSlug(input.name, list.slug, address, list.id);
  }

  // no link or Trade state, which are the post's (`trade.savePost`); Open to only off Trade
  await db
    .update(lists)
    .set({
      name: input.name,
      gridColumns: input.gridColumns,
      profileAddress: list.isProfileBind
        ? undefined
        : input.profileAddress
          ? input.profileAddress.toLowerCase()
          : null,
      description: input.description,
      currency:
        list.listType === "sale" && input.currency ? normalizeCurrency(input.currency) : null,
      profileSlug,
      hideSerial:
        ["sale", "have"].includes(list.listType) && list.isProfileBind ? input.hideSerial : false,
      ratio: takesRatio(list.listType) ? input.ratio : undefined,
      removeOnReceive: list.listType === "want" ? input.removeOnReceive : undefined,
      ...(openTo.action === "write" && openToColumns(openTo.flags)),
    })
    .where(eq(lists.id, list.id));
  await touchList([list.id]);
}

export async function deleteList(userId: string, slug: string) {
  const list = await findOwnedList(slug, userId);

  const unlinked = await db.transaction(async (tx) => {
    // ON DELETE SET NULL also locks the partner, so take the shared lock in id order first
    if (list.listType !== "general") await lockTradeLists(tx, userId);
    const partners = await tx
      .select({ id: lists.id })
      .from(lists)
      .where(eq(lists.linkedListId, list.id));
    await tx.delete(lists).where(eq(lists.id, list.id));
    // the partner of a deleted lead stands alone now, and may need a row of its own
    if (list.listType !== "general") await syncPostRows(tx, userId);
    return partners.map((partner) => partner.id);
  });
  // the partner loses its link through the foreign key, which leaves its updated_at alone
  if (unlinked.length > 0) await touchList(unlinked);
  else await bumpTradeVersions([userId]);
}
