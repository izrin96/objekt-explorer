import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { normalizeCurrency } from "@repo/lib/currency";
import { eq } from "drizzle-orm";

import { refuse } from "../../lib/refuse";
import type { EditListInput } from "../../schemas/list";
import { takesRatio } from "../../schemas/trade-ratio";
import { bumpTradeVersions } from "../moderation/safety-cache";
import { assertProfileOwned } from "../profile";
import { generateProfileSlug } from "./create";
import { findOwnedList } from "./read";
import { lockPosts, touchList, writePosts } from "./shared";

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

  // no pairing, Trade state or Open to, which are the post's (`trade.savePost`)
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
    })
    .where(eq(lists.id, list.id));
  await touchList([list.id]);
}

export async function deleteList(userId: string, slug: string) {
  const list = await findOwnedList(slug, userId);
  if (list.listType === "general") {
    await db.delete(lists).where(eq(lists.id, list.id));
    await bumpTradeVersions([userId]);
    return;
  }

  const unpaired = await db.transaction(async (tx) => {
    const locked = await lockPosts(tx, userId);
    // rows first: a paired want list on Trade takes over its deleted lead's row and keeps the
    // post id, which the cascade of the delete would have ended
    const unpaired = await writePosts(tx, userId, locked, { removed: [list.id] });
    await tx.delete(lists).where(eq(lists.id, list.id));
    return unpaired;
  });
  // the partner loses its pair through the foreign keys, which leave its updated_at alone
  if (unpaired.length > 0) await touchList(unpaired);
  else await bumpTradeVersions([userId]);
}
