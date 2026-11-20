import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { collectionMedia, modAudit } from "@repo/db/schema";
import {
  agreedText,
  type ColourInput,
  type ColourRow,
  cosmoColours,
  normaliseColour,
  differsFromCosmo,
  numberKey,
  type OverrideColours,
  overridesOf,
  planColourWrite,
  type SiblingMember,
  suggestSiblings,
} from "@repo/lib/collection-colours";
import { colourColumns, lockColourRow, writeColourSet } from "@repo/lib/server/collection-colours";
import { and, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";

import { refuse } from "../../lib/refuse";
import { iso } from "../../lib/time";
import type { SetCollectionColorsInput, SetCollectionColorsManyInput } from "../../schemas/admin";
import { fetchPartners } from "../chat";
import { audit } from "../moderation/core";
import { bumpCollectionList, collectionListModifiedAt } from "../objekt/collection";
import { forgetSpinHeld } from "../objekt/owned";

const HISTORY_LIMIT = 50;

const slugOfEntry = sql<string>`${modAudit.detail}->>'slug'`;

const byOfEntry = sql<string | null>`${modAudit.detail}->>'by'`;

type LastChange = { actorId: string | null; byCosmo: boolean; at: string };

/**
 * Who last changed each slug's colours and when: its latest `collection_override` entry, which
 * the worker writes with no actor and `by: "cosmo"` when Cosmo resolved a fill.
 */
async function lastChanges(slugs: string[]) {
  if (slugs.length === 0) return new Map<string, LastChange>();
  const rows = await db
    .selectDistinctOn([slugOfEntry], {
      slug: slugOfEntry,
      actorId: modAudit.actorId,
      by: byOfEntry,
      createdAt: modAudit.createdAt,
    })
    .from(modAudit)
    .where(and(eq(modAudit.action, "collection_override"), inArray(slugOfEntry, slugs)))
    .orderBy(slugOfEntry, desc(modAudit.createdAt), desc(modAudit.id));
  return new Map(
    rows.map((row) => [
      row.slug,
      { actorId: row.actorId, byCosmo: row.by === "cosmo", at: row.createdAt },
    ]),
  );
}

/** Cosmo's recorded text colour per slug, from connected accounts' reads. */
async function recordedTexts(slugs: string[]) {
  if (slugs.length === 0) return new Map<string, string>();
  const rows = await db
    .select({ slug: collectionMedia.slug, textColor: collectionMedia.textColor })
    .from(collectionMedia)
    .where(and(inArray(collectionMedia.slug, slugs), isNotNull(collectionMedia.textColor)));
  return new Map(rows.map((row) => [row.slug, row.textColor!]));
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

/**
 * One collection's source colours, its override, Cosmo's colours, and who changed it last and
 * when. Edit reads Cosmo's text colour here for a row with no override, which the list lacks.
 */
export async function collectionColors(slug: string) {
  const [[row], recorded] = await Promise.all([
    indexer.select(colourColumns).from(collections).where(eq(collections.slug, slug)),
    recordedTexts([slug]),
  ]);
  if (!row) {
    refuse("NOT_FOUND", "admin_collection_not_found", "No collection has this slug");
  }
  const { source, ...override } = colourView(row);
  const cosmo = cosmoColours(row, recorded.get(slug) ?? null);
  if (!isOverridden(row)) return { slug, source, cosmo, override: null };
  const change = (await lastChanges([slug])).get(slug);
  const people = await fetchPartners(change?.actorId ? [change.actorId] : []);
  return {
    slug,
    source,
    cosmo,
    override: {
      ...override,
      updatedBy: change?.actorId ? (people.get(change.actorId) ?? null) : null,
      updatedByCosmo: change?.byCosmo ?? false,
      updatedAt: change ? iso(change.at) : null,
    },
  };
}

type NumberRow = { slug: string; artist: string; season: string; collectionNo: string };

/** Every member of the collection numbers whose overridden text colour may have read siblings. */
async function textSiblings(rows: (NumberRow & { sourceTextColor: string | null })[]) {
  const numbers = rows.filter((row) => row.sourceTextColor !== null);
  if (numbers.length === 0) return [];
  const keys = new Set(numbers.map(numberKey));
  const candidates = await indexer
    .select({
      slug: collections.slug,
      artist: collections.artist,
      season: collections.season,
      collectionNo: collections.collectionNo,
      member: collections.member,
    })
    .from(collections)
    .where(inArray(collections.collectionNo, [...new Set(numbers.map((row) => row.collectionNo))]));
  return candidates.filter((row) => keys.has(numberKey(row)));
}

/**
 * For one unread member, the read members of its collection number when they agree on Cosmo's
 * text colour and it equals `shown`; null otherwise.
 */
function siblingProof(siblings: (NumberRow & { member: string })[], recorded: Map<string, string>) {
  const byNumber = Map.groupBy(siblings, numberKey);
  return (row: NumberRow, shown: string) => {
    const group = byNumber.get(numberKey(row)) ?? [];
    const agreed = agreedText(
      group.map((member) => ({
        slug: member.slug,
        recordedText: recorded.get(member.slug) ?? null,
      })),
    );
    if (!agreed || agreed.colour !== normaliseColour(shown)) return null;
    const members = new Map(group.map((member) => [member.slug, member.member]));
    return agreed.read.map((slug) => ({ slug, member: members.get(slug) ?? slug }));
  };
}

/**
 * Every overridden collection, newest change first and those with no history last, each with its
 * source colours; the latest collection audit entries; and when the collection list last changed.
 */
export async function collectionOverrides() {
  const [rows, history, modifiedAt] = await Promise.all([
    indexer
      .select({
        slug: collections.slug,
        artist: collections.artist,
        season: collections.season,
        collectionNo: collections.collectionNo,
        ...colourColumns,
      })
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
  const slugs = rows.map((row) => row.slug);
  const [changes, siblings] = await Promise.all([lastChanges(slugs), textSiblings(rows)]);
  const recorded = await recordedTexts([
    ...new Set([...slugs, ...siblings.map((sibling) => sibling.slug)]),
  ]);
  const proofOf = siblingProof(siblings, recorded);
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
    const text = recorded.get(row.slug) ?? null;
    return Object.assign(colourView(row), {
      slug: row.slug,
      artist: row.artist,
      season: row.season,
      collectionNo: row.collectionNo,
      /** Cosmo's colours, null where unknown */
      cosmo: cosmoColours(row, text),
      /** which unpinned overrides differ from a known Cosmo colour */
      differs: differsFromCosmo(row, text),
      /** read siblings whose agreed Cosmo text colour this unread member's staff text matches */
      textMatchesSiblings:
        text === null && row.sourceTextColor !== null ? proofOf(row, row.textColor) : null,
      updatedBy: personOf(change?.actorId ?? null),
      /** true when Cosmo made the latest change */
      updatedByCosmo: change?.byCosmo ?? false,
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

type SaveOptions = {
  /** the overrides the admin saw; the save is skipped when the row no longer has them */
  expected?: OverrideColours;
  /** the read members a suggestion came from; the save is skipped once the slug has a read */
  from?: string[];
};

/**
 * Saves one slug's colours under its row lock: the audit entry commits inside the lock, before
 * the indexer, so no stored colour lacks history (and the replay can restore it). False when the
 * row is missing or no longer matches what the admin saw.
 */
async function saveColours(me: string, slug: string, input: ColourInput, options: SaveOptions) {
  const text = (await recordedTexts([slug])).get(slug) ?? null;
  // a read the planner cannot use is no read, as `suggestSiblings` counts it
  if (options.from && normaliseColour(text) !== null) return false;
  let audited = false;
  try {
    return await indexer.transaction(async (itx) => {
      const row = await lockColourRow(itx, slug);
      if (!row) {
        if (options.expected) return false;
        refuse("NOT_FOUND", "admin_collection_not_found", "No collection has this slug");
      }
      // a suggestion only needs the text still unset; a background override does not stop it
      const textOnly = options.from !== undefined;
      if (options.expected && !sameOverrides(overridesOf(row), options.expected, textOnly)) {
        return false;
      }
      const { set, before, after, shown } = planColourWrite(row, input, text);
      await writeColourSet(itx, slug, set);
      await db.transaction((tx) =>
        audit(tx, {
          actorId: me,
          action: "collection_override",
          targetUserId: null,
          detail: { slug, before, after, shown, ...(options.from ? { from: options.from } : {}) },
        }),
      );
      audited = true;
      return true;
    });
  } catch (error) {
    if (audited) {
      console.error(
        `Collection colours of ${slug}: the history entry committed but the indexer did not; the replay applies it`,
        error,
      );
    }
    throw error;
  }
}

const sameOverrides = (a: OverrideColours, b: OverrideColours, textOnly: boolean) =>
  a.textColor?.toLowerCase() === b.textColor?.toLowerCase() &&
  a.textPinned === b.textPinned &&
  (textOnly ||
    (a.backgroundColor?.toLowerCase() === b.backgroundColor?.toLowerCase() &&
      a.backgroundPinned === b.backgroundPinned));

/** Bumps the collection list and drops Spin's cached held list, which carries colours. */
async function afterColourWrite() {
  const [{ refreshed }] = await Promise.all([bumpCollectionList(), forgetSpinHeld()]);
  return refreshed;
}

/**
 * Sets, pins or resets a collection's colours on its indexer row. A colour left out keeps its
 * override; null resets it to Cosmo's recorded text colour or the source kept beside it.
 */
export async function setCollectionColors(me: string, input: SetCollectionColorsInput) {
  const { slug, ...change } = input;
  await saveColours(me, slug, change, {});
  return { refreshed: await afterColourWrite() };
}

/**
 * Saves several slugs one row at a time, each as `setCollectionColors` saves one: a group's Pin or
 * Reset, or an applied suggestion. Rows that changed since the admin saw them are skipped, and rows
 * whose save threw are failed, each named.
 */
export async function setCollectionColorsMany(me: string, input: SetCollectionColorsManyInput) {
  const saved: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];
  for (const { slug, expected, from, ...change } of input.entries) {
    try {
      if (await saveColours(me, slug, change, { expected, from })) saved.push(slug);
      else skipped.push(slug);
    } catch (error) {
      // one row's lock timeout or failure must not leave the rows already saved unbumped
      console.error(`Collection colours of ${slug} failed in a batch`, error);
      failed.push(slug);
    }
  }
  const refreshed = saved.length > 0 ? await afterColourWrite() : false;
  return { saved, skipped, failed, refreshed };
}

/**
 * Per collection number where every read member agrees on Cosmo's text colour, the unread members
 * (no recorded text colour, no staff text colour) that show another colour. The two tables live in
 * different databases, so they are joined here.
 */
export async function collectionSuggestions() {
  const [recorded, rows] = await Promise.all([
    db
      .select({ slug: collectionMedia.slug, textColor: collectionMedia.textColor })
      .from(collectionMedia)
      .where(isNotNull(collectionMedia.textColor)),
    indexer
      .select({
        slug: collections.slug,
        artist: collections.artist,
        season: collections.season,
        collectionNo: collections.collectionNo,
        member: collections.member,
        textColor: collections.textColor,
        sourceTextColor: collections.sourceTextColor,
      })
      .from(collections),
  ]);
  const texts = new Map(recorded.map((row) => [row.slug, row.textColor]));
  const numbers = new Map<string, { number: (typeof rows)[number]; members: SiblingMember[] }>();
  const members = new Map(rows.map((row) => [row.slug, row.member]));
  for (const row of rows) {
    const key = numberKey(row);
    const entry = numbers.get(key) ?? { number: row, members: [] };
    entry.members.push({
      slug: row.slug,
      textColor: row.textColor,
      overridden: row.sourceTextColor !== null,
      recordedText: texts.get(row.slug) ?? null,
    });
    numbers.set(key, entry);
  }
  const named = (slug: string) => ({ slug, member: members.get(slug) ?? slug });
  return [...numbers.values()]
    .flatMap(({ number, members: group }) => {
      const suggestion = suggestSiblings(group);
      if (!suggestion) return [];
      const shown = new Map(group.map((member) => [member.slug, member.textColor]));
      return [
        {
          artist: number.artist,
          season: number.season,
          collectionNo: number.collectionNo,
          colour: suggestion.colour,
          read: suggestion.read.map(named),
          unread: suggestion.unread.map((slug) => ({
            slug,
            member: members.get(slug) ?? slug,
            textColor: shown.get(slug)!,
          })),
        },
      ];
    })
    .toSorted(
      (a, b) =>
        a.artist.localeCompare(b.artist) ||
        a.season.localeCompare(b.season) ||
        a.collectionNo.localeCompare(b.collectionNo, undefined, { numeric: true }),
    );
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
