import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { collectionOverride, modAudit } from "@repo/db/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";

import { refuse } from "../../lib/refuse";
import { iso } from "../../lib/time";
import type { SetCollectionColorsInput } from "../../schemas/admin";
import { fetchPartners } from "../chat";
import { bumpCollectionList, collectionListModifiedAt } from "../collection";
import { audit } from "../moderation/core";

const HISTORY_LIMIT = 50;

type Colors = { textColor: string | null; backgroundColor: string | null };
type SourceColors = { textColor: string; backgroundColor: string };

/** The source's colours of each slug, from the indexer. */
async function sourceColors(slugs: string[]) {
  if (slugs.length === 0) return new Map<string, SourceColors>();
  const rows = await indexer
    .select({
      slug: collections.slug,
      textColor: collections.textColor,
      backgroundColor: collections.backgroundColor,
    })
    .from(collections)
    .where(inArray(collections.slug, slugs));
  return new Map<string, SourceColors>(
    rows.map((row) => [
      row.slug,
      {
        textColor: row.textColor.toLowerCase(),
        backgroundColor: row.backgroundColor.toLowerCase(),
      },
    ]),
  );
}

const overrideColumns = {
  slug: collectionOverride.slug,
  textColor: collectionOverride.textColor,
  backgroundColor: collectionOverride.backgroundColor,
  updatedBy: collectionOverride.updatedBy,
  updatedAt: collectionOverride.updatedAt,
};

/** One collection's source colours, its override, and who changed it and when. */
export async function collectionColors(slug: string) {
  const [sources, [row]] = await Promise.all([
    sourceColors([slug]),
    db.select(overrideColumns).from(collectionOverride).where(eq(collectionOverride.slug, slug)),
  ]);
  const source = sources.get(slug);
  if (!source) {
    refuse("NOT_FOUND", "admin_collection_not_found", "No collection has this slug");
  }
  const people = await fetchPartners(row?.updatedBy ? [row.updatedBy] : []);
  return {
    slug,
    source,
    override: row
      ? {
          textColor: row.textColor,
          backgroundColor: row.backgroundColor,
          updatedBy: row.updatedBy ? (people.get(row.updatedBy) ?? null) : null,
          updatedAt: iso(row.updatedAt)!,
        }
      : null,
  };
}

/**
 * Every override, newest change first, each with its source colours; the latest collection audit
 * entries; and when the collection list last changed.
 */
export async function collectionOverrides() {
  const [rows, history, modifiedAt] = await Promise.all([
    db.select(overrideColumns).from(collectionOverride).orderBy(desc(collectionOverride.updatedAt)),
    db
      .select({
        id: modAudit.id,
        actorId: modAudit.actorId,
        action: modAudit.action,
        detail: modAudit.detail,
        createdAt: modAudit.createdAt,
      })
      .from(modAudit)
      .where(inArray(modAudit.action, ["collection_override", "collection_refresh"]))
      .orderBy(desc(modAudit.createdAt), desc(modAudit.id))
      .limit(HISTORY_LIMIT),
    collectionListModifiedAt(),
  ]);
  const [sources, people] = await Promise.all([
    sourceColors(rows.map((row) => row.slug)),
    fetchPartners([
      ...new Set(
        [...rows.map((row) => row.updatedBy), ...history.map((entry) => entry.actorId)].filter(
          (id) => id !== null,
        ),
      ),
    ]),
  ]);
  const personOf = (id: string | null) => (id === null ? null : (people.get(id) ?? null));
  return {
    overrides: rows.map((row) => ({
      slug: row.slug,
      textColor: row.textColor,
      backgroundColor: row.backgroundColor,
      /** null when the indexer has no such collection any more */
      source: sources.get(row.slug) ?? null,
      updatedBy: personOf(row.updatedBy),
      updatedAt: iso(row.updatedAt)!,
    })),
    history: history.map((entry) => ({
      id: entry.id,
      action: entry.action as "collection_override" | "collection_refresh",
      actor: personOf(entry.actorId),
      detail: entry.detail as Record<string, unknown> | null,
      createdAt: iso(entry.createdAt)!,
    })),
    modifiedAt,
  };
}

/**
 * Sets or resets a collection's colours. A colour left out keeps its override; null resets it to
 * the source's, and with both reset the row goes. The list is bumped after the commit.
 */
export async function setCollectionColors(me: string, input: SetCollectionColorsInput) {
  const sources = await sourceColors([input.slug]);
  if (!sources.has(input.slug)) {
    refuse("NOT_FOUND", "admin_collection_not_found", "No collection has this slug");
  }

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        textColor: collectionOverride.textColor,
        backgroundColor: collectionOverride.backgroundColor,
      })
      .from(collectionOverride)
      .where(eq(collectionOverride.slug, input.slug))
      .for("update");
    const before: Colors = {
      textColor: current?.textColor ?? null,
      backgroundColor: current?.backgroundColor ?? null,
    };
    const after: Colors = {
      textColor: input.textColor === undefined ? before.textColor : input.textColor,
      backgroundColor:
        input.backgroundColor === undefined ? before.backgroundColor : input.backgroundColor,
    };

    if (after.textColor === null && after.backgroundColor === null) {
      await tx.delete(collectionOverride).where(eq(collectionOverride.slug, input.slug));
    } else {
      await tx
        .insert(collectionOverride)
        .values({ slug: input.slug, ...after, updatedBy: me, updatedAt: sql`now()` })
        .onConflictDoUpdate({
          target: collectionOverride.slug,
          set: { ...after, updatedBy: me, updatedAt: sql`now()` },
        });
    }

    await audit(tx, {
      actorId: me,
      action: "collection_override",
      targetUserId: null,
      detail: { slug: input.slug, before, after },
    });
  });

  const { refreshed } = await bumpCollectionList();
  return { refreshed };
}

/** Refresh collection list: marks the list changed now, and writes it to the history. */
export async function refreshCollections(me: string) {
  const { refreshed, modifiedAt } = await bumpCollectionList();
  if (refreshed) {
    await db.transaction((tx) =>
      audit(tx, {
        actorId: me,
        action: "collection_refresh",
        targetUserId: null,
        detail: { modifiedAt },
      }),
    );
  }
  return { refreshed, modifiedAt };
}
