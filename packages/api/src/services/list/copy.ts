import { db, type Tx } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { listEntries, lists } from "@repo/db/schema";
import type { List } from "@repo/db/schema";
import { chunkMap } from "@repo/lib";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type * as z from "zod";

import { TOKEN_CHUNK_SIZE } from "../../constants";
import { buildCopyRows, type CopyRow, type OwnedCopy } from "../../lib/list-copy";
import { refuse } from "../../lib/refuse";
import { type copyPreviewInputSchema } from "../../schemas/list";
import {
  carriesPrices,
  carriesRatios,
  copyMode,
  copyUnit,
  needsHoldings,
} from "../../schemas/list-copy";
import { assertProfileOwned } from "../profile";
import { type PreparedList, writeList } from "./create";
import { ownedCopiesOf } from "./entries";
import { copyRulesTx } from "./rules";

type CopyTarget = Pick<
  z.infer<typeof copyPreviewInputSchema>,
  "listType" | "isProfileBind" | "profileAddress"
>;

/**
 * What a copy of `source` would hold under `target`'s binding, read but not written.
 * A bound target's profile is checked before its holdings are read.
 */
export async function planCopy(source: List, target: CopyTarget, userId: string) {
  const isProfileBind = ["have", "sale"].includes(target.listType) && target.isProfileBind;
  const binding = { ...target, isProfileBind };
  const mode = copyMode(source, binding);

  const entries = await db
    .select({
      collectionSlug: listEntries.collectionSlug,
      objektId: listEntries.objektId,
      price: listEntries.price,
      isQyop: listEntries.isQyop,
      note: listEntries.note,
      ratio: listEntries.ratio,
    })
    .from(listEntries)
    // a rule's entries travel as the rule (`copyRules`), or not at all
    .where(and(eq(listEntries.listId, source.id), isNull(listEntries.ruleId)))
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
      const copies = await ownedCopiesOf(owner, slugs);
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
    carriesPrices(source.listType, target.listType),
    carriesRatios(source.listType, target.listType),
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

/** Creates the copy, its rows, a carried Ratio for all and a want list's rules, in one transaction. */
export async function writeCopy(
  source: List,
  listType: CopyTarget["listType"],
  prepared: PreparedList,
  rows: CopyRow[],
) {
  return db.transaction(async (tx) => {
    const created = await writeList(tx, prepared);
    await insertCopyRows(tx, created.id, rows);
    if (source.ratio !== null && carriesRatios(source.listType, listType)) {
      await tx.update(lists).set({ ratio: source.ratio }).where(eq(lists.id, created.id));
    }
    // any other copy drops the rules with the objekts they want
    if (listType === "want" && source.listType === "want") {
      await copyRulesTx(tx, source.id, created.id);
    }
    return created;
  });
}
