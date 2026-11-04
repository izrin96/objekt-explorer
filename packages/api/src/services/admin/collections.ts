import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { modAudit } from "@repo/db/schema";
import { type ColourRow, overridesOf, planColourWrite } from "@repo/lib/collection-colours";
import { colourColumns, lockColourRow, writeColourSet } from "@repo/lib/server/collection-colours";
import { and, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";

import { refuse } from "../../lib/refuse";
import { iso } from "../../lib/time";
import type { SetCollectionColorsInput } from "../../schemas/admin";
import { fetchPartners } from "../chat";
import { bumpCollectionList, collectionListModifiedAt } from "../collection";
import { audit } from "../moderation/core";
import { forgetSpinHeld } from "../owned";

const HISTORY_LIMIT = 50;

const slugOfEntry = sql<string>`${modAudit.detail}->>'slug'`;

/** Who last changed each slug's colours and when: its latest `collection_override` entry. */
async function lastChanges(slugs: string[]) {
  if (slugs.length === 0) return new Map<string, { actorId: string | null; at: string }>();
  const rows = await db
    .selectDistinctOn([slugOfEntry], {
      slug: slugOfEntry,
      actorId: modAudit.actorId,
      createdAt: modAudit.createdAt,
    })
    .from(modAudit)
    .where(and(eq(modAudit.action, "collection_override"), inArray(slugOfEntry, slugs)))
    .orderBy(slugOfEntry, desc(modAudit.createdAt), desc(modAudit.id));
  return new Map(rows.map((row) => [row.slug, { actorId: row.actorId, at: row.createdAt }]));
}

/** The colours staff override (null where the source's apply) and the source's colours. */
function colourView(row: ColourRow) {
  return {
    ...overridesOf(row),
    source: {
      textColor: row.sourceTextColor ?? row.textColor,
      backgroundColor: row.sourceBackgroundColor ?? row.backgroundColor,
    },
  };
}

const isOverridden = (row: ColourRow) =>
  row.sourceTextColor !== null || row.sourceBackgroundColor !== null;

/** One collection's source colours, its override, and who changed it last and when. */
export async function collectionColors(slug: string) {
  const [row] = await indexer
    .select(colourColumns)
    .from(collections)
    .where(eq(collections.slug, slug));
  if (!row) {
    refuse("NOT_FOUND", "admin_collection_not_found", "No collection has this slug");
  }
  const { source, ...override } = colourView(row);
  if (!isOverridden(row)) return { slug, source, override: null };
  const change = (await lastChanges([slug])).get(slug);
  const people = await fetchPartners(change?.actorId ? [change.actorId] : []);
  return {
    slug,
    source,
    override: {
      ...override,
      updatedBy: change?.actorId ? (people.get(change.actorId) ?? null) : null,
      updatedAt: change ? iso(change.at) : null,
    },
  };
}

/**
 * Every overridden collection, newest change first and those with no history last, each with its
 * source colours; the latest collection audit entries; and when the collection list last changed.
 */
export async function collectionOverrides() {
  const [rows, history, modifiedAt] = await Promise.all([
    indexer
      .select({ slug: collections.slug, ...colourColumns })
      .from(collections)
      .where(
        or(isNotNull(collections.sourceTextColor), isNotNull(collections.sourceBackgroundColor)),
      ),
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
  const changes = await lastChanges(rows.map((row) => row.slug));
  const people = await fetchPartners([
    ...new Set(
      [
        ...[...changes.values()].map((c) => c.actorId),
        ...history.map((entry) => entry.actorId),
      ].filter((id) => id !== null),
    ),
  ]);
  const personOf = (id: string | null) => (id === null ? null : (people.get(id) ?? null));
  const overrides = rows.map((row) => {
    const change = changes.get(row.slug);
    return Object.assign(colourView(row), {
      slug: row.slug,
      updatedBy: personOf(change?.actorId ?? null),
      /** null for a changed row with no history entry */
      updatedAt: change ? iso(change.at) : null,
    });
  });
  overrides.sort(
    (a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || a.slug.localeCompare(b.slug),
  );
  return {
    overrides,
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
 * Sets or resets a collection's colours on its indexer row. A colour left out keeps its override;
 * null resets it to the source kept beside it. The audit entry commits inside the row lock, before
 * the indexer, so no stored colour lacks history (and the replay can restore it); then the list is
 * bumped and Spin's cached held list, which carries colours, is dropped.
 */
export async function setCollectionColors(me: string, input: SetCollectionColorsInput) {
  let audited = false;
  try {
    await indexer.transaction(async (itx) => {
      const row = await lockColourRow(itx, input.slug);
      if (!row) {
        refuse("NOT_FOUND", "admin_collection_not_found", "No collection has this slug");
      }
      const { set, before, after } = planColourWrite(row, input);
      await writeColourSet(itx, input.slug, set);
      await db.transaction((tx) =>
        audit(tx, {
          actorId: me,
          action: "collection_override",
          targetUserId: null,
          detail: { slug: input.slug, before, after },
        }),
      );
      audited = true;
    });
  } catch (error) {
    if (audited) {
      console.error(
        `Collection colours of ${input.slug}: the history entry committed but the indexer did not; the replay applies it`,
        error,
      );
    }
    throw error;
  }

  const [{ refreshed }] = await Promise.all([bumpCollectionList(), forgetSpinHeld()]);
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
