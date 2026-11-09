import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries } from "@repo/db/schema";
import type { List, ListEntry } from "@repo/db/schema";
import { chunkMap } from "@repo/lib";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { TOKEN_CHUNK_SIZE } from "../../constants";
import { refuse } from "../../lib/refuse";
import { type AddSource } from "../../schemas/list";
import { touchList } from "./shared";

type AddableList = Pick<List, "id" | "isProfileBind" | "profileAddress">;

/** What each added entry starts with: a sale list's price and note, set when the caller checked the list takes them. */
type EntryPricing = { price: number | null; isQyop: boolean; note: string | null };

/**
 * Of the requested items that added nothing, `unowned` counts those the bound
 * list's profile holds no copy of, and `skipped` the rest, already in the list.
 */
export async function addEntries(
  list: AddableList,
  from: AddSource,
  skipDups: boolean,
  pricing?: EntryPricing,
): Promise<{ rows: ListEntry[]; skipped: number; unowned: number }> {
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
        pricing,
      );
      const added = new Set(rows.map((row) => row.collectionSlug));
      const held = new Set(copies.map((copy) => copy.slug));
      return {
        rows,
        skipped: slugs.filter((slug) => held.has(slug) && !added.has(slug)).length,
        unowned: slugs.filter((slug) => !held.has(slug)).length,
      };
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
      pricing,
    );
    const heldCount = tokenIds.filter((id) => owned.has(id)).length;
    return { rows, skipped: heldCount - rows.length, unowned: requested - heldCount };
  }

  if (from.type !== "collections") {
    refuse(
      "BAD_REQUEST",
      "list_collections_required",
      "Collections required for non-profile-bound lists",
    );
  }

  // a slug repeated on purpose stays: with skipDups off it adds another copy
  const known = await knownSlugs(from.slugs);
  let slugs = from.slugs.filter((slug) => known.has(slug));
  if (skipDups) {
    const existing = await db
      .selectDistinct({ slug: listEntries.collectionSlug })
      .from(listEntries)
      .where(and(eq(listEntries.listId, list.id), isNull(listEntries.ruleId)));
    const existingSlugs = new Set(existing.map((entry) => entry.slug));
    slugs = Array.from(new Set(slugs)).filter((slug) => !existingSlugs.has(slug));
  }

  const rows =
    slugs.length === 0
      ? []
      : await db.transaction((tx) =>
          chunkMap(slugs, TOKEN_CHUNK_SIZE, (batch) =>
            tx
              .insert(listEntries)
              // oxlint-disable-next-line oxc/no-map-spread
              .values(
                batch.map((collectionSlug) => ({ listId: list.id, collectionSlug, ...pricing })),
              )
              .returning(),
          ),
        );
  if (rows.length > 0) await touchList([list.id]);
  return { rows, skipped: from.slugs.length - rows.length, unowned: 0 };
}

async function knownSlugs(slugs: string[]) {
  const found = await chunkMap(Array.from(new Set(slugs)), TOKEN_CHUNK_SIZE, (batch) =>
    indexer
      .select({ slug: collections.slug })
      .from(collections)
      .where(inArray(collections.slug, batch)),
  );
  return new Set(found.map((row) => row.slug));
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

async function insertTokens(
  listId: number,
  tokens: { id: string; slug: string }[],
  pricing?: EntryPricing,
) {
  if (tokens.length === 0) return [];
  const inserted = await db.transaction((tx) =>
    chunkMap(tokens, TOKEN_CHUNK_SIZE, (batch) =>
      tx
        .insert(listEntries)
        .values(
          // oxlint-disable-next-line oxc/no-map-spread
          batch.map((token) => ({
            listId,
            objektId: token.id,
            collectionSlug: token.slug,
            ...pricing,
          })),
        )
        .onConflictDoNothing()
        .returning(),
    ),
  );
  if (inserted.length > 0) await touchList([listId]);
  return inserted;
}
