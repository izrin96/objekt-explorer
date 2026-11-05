import { db } from "@repo/db";
import { listEntries, lists } from "@repo/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";

import { untradeableKey } from "../../../lib/trade-feed";
import { addressesByUser } from "../../../lib/trade-rank";
import { fetchAddresses } from "../matches/holdings";
import { fetchUntradeable } from "./entries";

/**
 * The entries of the viewer's own have or sale list that Trade leaves out of their post, because
 * none of their addresses holds a transferable copy (see `fetchUntradeable`). A want list, or a
 * list that isn't theirs, has none.
 */
export async function fetchUnshownEntries(userId: string, slug: string) {
  const [list] = await db
    .select({ id: lists.id, listType: lists.listType })
    .from(lists)
    .where(and(eq(lists.slug, slug), eq(lists.userId, userId)));
  if (!list || list.listType === "want") return { entryIds: [] };

  const [rows, addressRows] = await Promise.all([
    db
      .select({
        id: listEntries.id,
        slug: listEntries.collectionSlug,
        objektId: listEntries.objektId,
      })
      .from(listEntries)
      .where(and(eq(listEntries.listId, list.id), isNotNull(listEntries.collectionSlug))),
    fetchAddresses([userId]),
  ]);
  const entries = rows.map((row) => ({ id: row.id, slug: row.slug!, objektId: row.objektId }));
  const untradeable = await fetchUntradeable(
    entries.map((entry) => ({ userId, objektId: entry.objektId, slug: entry.slug })),
    addressesByUser(addressRows),
  );
  return {
    entryIds: entries
      .filter((entry) => untradeable.has(untradeableKey(userId, entry)))
      .map((entry) => entry.id),
  };
}
