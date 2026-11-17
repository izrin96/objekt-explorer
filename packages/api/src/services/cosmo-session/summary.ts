import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import type { CosmoMediaSummary } from "../../schemas/cosmo-session";

/** Counts and one time for staff: never an address, a nickname or a user. One statement. */
export async function mediaSummary(): Promise<CosmoMediaSummary> {
  const { rows } = await db.execute<{
    live: number;
    signed_out: number;
    recorded: number;
    last_synced_at: Date | string | null;
  }>(sql`
    SELECT
      (SELECT count(*) FROM cosmo_session WHERE dead_at IS NULL)::int AS live,
      (SELECT count(*) FROM cosmo_session WHERE dead_at IS NOT NULL)::int AS signed_out,
      (
        SELECT count(*) FROM collection_media
        WHERE front_media IS NOT NULL OR band_image_url IS NOT NULL OR has_voice
          OR coalesce(back_image, '') <> '' OR coalesce(accent_color, '') <> ''
          OR coalesce(text_color, '') <> ''
      )::int AS recorded,
      (SELECT max(last_synced_at) FROM cosmo_session) AS last_synced_at
  `);
  const row = rows[0]!;
  return {
    live: row.live,
    signedOut: row.signed_out,
    recorded: row.recorded,
    lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at).toISOString() : null,
  };
}
