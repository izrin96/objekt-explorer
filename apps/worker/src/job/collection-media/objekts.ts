import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { sql } from "drizzle-orm";

import { observationsOf, type IndexerObjekt, type ObservedRow } from "@/lib/cosmo-objekts";
import { errorCode } from "@/lib/error-code";

import { mediaBeat, mediaLog, type Page, type Run, type SessionRow } from "./run";

/**
 * Keeps the page's objekts in `cosmo_objekt` (Decision 4): one indexer read for the holder check
 * and eligibility, one upsert. A failure is counted and never fails the session, so the media is
 * recorded, the cursor moves and the objekts are recorded on the session's next sync.
 */
export async function recordObjekts(run: Run, session: SessionRow, page: Page, observedAt: string) {
  if (page.skippedObjekts > 0) mediaBeat.count("objekts skipped_by_parse", page.skippedObjekts);
  if (page.partial > 0) mediaBeat.count("objekts partial", page.partial);
  // connected before the consent text covered objekt details: media only until a reconnect
  if (!session.objektsConsented) return;
  if (page.objekts.length === 0 || run.chainHeight === null) return;
  try {
    const indexed = await indexedHolders([...new Set(page.objekts.map((o) => o.tokenId))]);
    const { rows, skipped } = observationsOf(
      page.objekts,
      session.cosmoAddress,
      indexed,
      run.chainHeight,
      observedAt,
    );
    if (skipped.notMinted > 0) mediaBeat.count("objekts not_minted", skipped.notMinted);
    if (skipped.otherOwner > 0) mediaBeat.count("objekts other_owner", skipped.otherOwner);
    if (skipped.holderMismatch > 0) {
      mediaBeat.count("objekts holder_mismatch", skipped.holderMismatch);
    }
    if (skipped.duplicate > 0) mediaBeat.count("objekts duplicate", skipped.duplicate);
    if (rows.length === 0) return;
    const { upserted, changed } = await upsertObjekts(rows, run.chainHeight, observedAt);
    run.objektsRecorded += changed;
    if (upserted > changed) mediaBeat.count("objekts refreshed", upserted - changed);
  } catch (error) {
    run.objektsFailed += page.objekts.length;
    mediaLog.debug(`Objekt record failed: ${errorCode(error)}`);
  }
}

async function indexedHolders(tokenIds: string[]) {
  const { rows } = await indexer.execute<{
    id: string;
    owner: string;
    minted_at: string;
    received_at: string;
    slug: string;
    on_offline: IndexerObjekt["onOffline"];
  }>(sql`
    SELECT o.id, lower(o.owner) AS owner, to_json(o.minted_at) #>> '{}' AS minted_at,
      to_json(o.received_at) #>> '{}' AS received_at, c.slug, c.on_offline
    FROM objekt o JOIN collection c ON c.id = o.collection_id
    WHERE o.id = ANY(${sql.param(tokenIds)}::varchar[])
  `);
  return new Map<string, IndexerObjekt>(
    rows.map((r) => [
      r.id,
      {
        owner: r.owner,
        mintedAt: r.minted_at,
        receivedAt: r.received_at,
        slug: r.slug,
        onOffline: r.on_offline,
      },
    ]),
  );
}

/** A transferable judgement older than this is redone on the next read even when nothing changed. */
const REJUDGE_AFTER = "7 days";

/**
 * A repeated read only refreshes `observed_at` and `chain_height`: the transferable step judges
 * the row again only when `transferable`, the reason, `objekt_no`, `slug` or the recorded
 * `received_at` changed, or its last judgement is older than REJUDGE_AFTER. A serial is the token's for life,
 * so only a changed `objekt_no` or `slug` re-judges eligibility or queues a rewrite, and an
 * operator's `serial_eligible = false` survives repeated reads. An older read never overwrites a
 * newer one. Returns the rows written and how many of them were new or changed.
 */
async function upsertObjekts(rows: ObservedRow[], chainHeight: number, observedAt: string) {
  const { rows: counts } = await db.execute<{ upserted: number; changed: number }>(sql`
    WITH incoming AS (
      SELECT * FROM unnest(
        ${sql.param(rows.map((r) => r.tokenId))}::varchar[],
        ${sql.param(rows.map((r) => r.slug))}::varchar[],
        ${sql.param(rows.map((r) => r.objektNo))}::int[],
        ${sql.param(rows.map((r) => r.transferable))}::boolean[],
        ${sql.param(rows.map((r) => r.nonTransferableReason))}::varchar[],
        ${sql.param(rows.map((r) => r.usedForGrid))}::boolean[],
        ${sql.param(rows.map((r) => r.serialEligible))}::boolean[],
        ${sql.param(rows.map((r) => r.receivedAt))}::timestamptz[]
      ) AS r(token_id, slug, objekt_no, transferable, reason, used_for_grid, eligible, received_at)
    ),
    -- every sub-statement sees the snapshot before the upsert, so this is the rows as they were
    prev AS (
      SELECT co.token_id, co.transferable, co.non_transferable_reason, co.objekt_no, co.slug,
        co.received_at
      FROM cosmo_objekt co JOIN incoming USING (token_id)
    ),
    up AS (
      INSERT INTO cosmo_objekt AS co (token_id, slug, objekt_no, transferable,
        non_transferable_reason, used_for_grid, chain_height, observed_at, received_at,
        serial_eligible, serial_due, transferable_due)
      SELECT r.token_id, r.slug, r.objekt_no, r.transferable, r.reason, r.used_for_grid,
        ${chainHeight}, ${observedAt}::timestamptz, r.received_at, r.eligible,
        r.eligible IS DISTINCT FROM false, true
      FROM incoming r
      ON CONFLICT (token_id) DO UPDATE SET
        slug = excluded.slug,
        objekt_no = excluded.objekt_no,
        transferable = excluded.transferable,
        non_transferable_reason = excluded.non_transferable_reason,
        used_for_grid = excluded.used_for_grid,
        chain_height = excluded.chain_height,
        observed_at = excluded.observed_at,
        received_at = excluded.received_at,
        transferable_due = CASE
          WHEN co.transferable <> excluded.transferable
            OR co.non_transferable_reason IS DISTINCT FROM excluded.non_transferable_reason
            OR co.objekt_no <> excluded.objekt_no
            OR co.slug <> excluded.slug OR co.received_at IS DISTINCT FROM excluded.received_at
            OR co.transferable_checked_at IS NULL
            OR co.transferable_checked_at < now() - ${REJUDGE_AFTER}::interval
          THEN true ELSE co.transferable_due END,
        serial_eligible = CASE
          WHEN co.objekt_no <> excluded.objekt_no OR co.slug <> excluded.slug
            OR co.serial_eligible IS NULL
          THEN excluded.serial_eligible ELSE co.serial_eligible END,
        serial_due = CASE
          WHEN (co.objekt_no <> excluded.objekt_no OR co.slug <> excluded.slug)
            AND excluded.serial_eligible IS DISTINCT FROM false
          THEN true ELSE co.serial_due END
      WHERE co.observed_at <= excluded.observed_at
      RETURNING co.token_id, co.transferable, co.non_transferable_reason, co.objekt_no, co.slug,
        co.received_at
    )
    SELECT count(*)::int AS upserted,
      count(*) FILTER (WHERE p.token_id IS NULL OR p.transferable <> up.transferable
        OR p.non_transferable_reason IS DISTINCT FROM up.non_transferable_reason
        OR p.objekt_no <> up.objekt_no OR p.slug <> up.slug
        OR p.received_at IS DISTINCT FROM up.received_at)::int AS changed
    FROM up LEFT JOIN prev p USING (token_id)
  `);
  return counts[0] ?? { upserted: 0, changed: 0 };
}
