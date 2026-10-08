import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, transfers } from "@repo/db/indexer/schema";
import { tradeLeg } from "@repo/db/schema";
import { and, gte, inArray, sql } from "drizzle-orm";

import { type MatchLeg, type MatchTransfer, matchLegs } from "../lib/trade-match";
import { unique } from "../lib/unique";

export type LegRow = {
  id: number;
  trade_id: number;
  offer_id: number;
  conversation_id: number;
  user_a: string;
  user_b: string;
  from_user_id: string;
  to_user_id: string;
  from_addresses: string[];
  to_addresses: string[];
  from_current: string[];
  to_current: string[];
  collection_slug: string;
  objekt_id: string | null;
  window_start: string;
  accepted_at: string;
};

/**
 * The open legs of in-progress trades, or of the ones these users give in, with both sides'
 * current addresses. A transfer can only verify a leg its sender gives, so the legs the
 * givers give hold every leg that competes for their transfers.
 */
export async function loadOpenLegs(giverIds?: string[]): Promise<LegRow[]> {
  const result = await db.execute<LegRow>(sql`
    SELECT l.id, l.trade_id, t.offer_id, o.conversation_id, t.user_a, t.user_b,
      l.from_user_id, l.to_user_id, l.from_addresses, l.to_addresses,
      ARRAY(SELECT lower(a.address) FROM user_address a WHERE a.user_id = l.from_user_id) AS from_current,
      ARRAY(SELECT lower(a.address) FROM user_address a WHERE a.user_id = l.to_user_id) AS to_current,
      l.collection_slug, l.objekt_id, o.created_at::text AS window_start,
      t.accepted_at::text AS accepted_at
    FROM trade_leg l
    JOIN trade t ON t.id = l.trade_id
    JOIN offer o ON o.id = t.offer_id
    WHERE l.open AND t.status = 'in_progress'
      ${giverIds === undefined ? sql`` : sql`AND l.from_user_id = ANY(${sql.param(giverIds)}::text[])`}
  `);
  return result.rows;
}

const addressSet = (snapshot: string[], current: string[]) =>
  new Set([...snapshot, ...current].map((address) => address.toLowerCase()));

/** Every open leg is matched in one pass, so a transfer is spent on one leg across trades. */
export async function matchOpenLegs(legs: LegRow[]) {
  const anyCopy = legs.filter((leg) => leg.objekt_id === null);
  const collectionRows =
    anyCopy.length === 0
      ? []
      : await indexer
          .select({ id: collections.id, slug: collections.slug })
          .from(collections)
          .where(inArray(collections.slug, unique(anyCopy.map((leg) => leg.collection_slug))));
  const uuidOf = new Map(collectionRows.map((row) => [row.slug, row.id]));

  const matchLegsInput: MatchLeg[] = legs.map((leg) => ({
    id: leg.id,
    objektId: leg.objekt_id,
    collectionId: uuidOf.get(leg.collection_slug) ?? null,
    windowStart: leg.window_start,
    acceptedAt: leg.accepted_at,
    giver: addressSet(leg.from_addresses, leg.from_current),
    receiver: addressSet(leg.to_addresses, leg.to_current),
  }));
  const since = new Date(
    Math.min(...legs.map((leg) => new Date(leg.window_start).getTime())),
  ).toISOString();

  const specificIds = unique(legs.flatMap((leg) => (leg.objekt_id ? [leg.objekt_id] : [])));
  const anyUuids = unique(anyCopy.flatMap((leg) => uuidOf.get(leg.collection_slug) ?? []));
  const givers = unique(
    anyCopy.flatMap((leg) => Array.from(addressSet(leg.from_addresses, leg.from_current))),
  );
  const columns = {
    id: transfers.id,
    from: transfers.from,
    to: transfers.to,
    timestamp: transfers.timestamp,
    hash: transfers.hash,
    objektId: transfers.objektId,
    collectionId: transfers.collectionId,
  };
  const [specific, copies] = await Promise.all([
    specificIds.length === 0
      ? []
      : indexer
          .select(columns)
          .from(transfers)
          .where(and(inArray(transfers.objektId, specificIds), gte(transfers.timestamp, since))),
    anyUuids.length === 0 || givers.length === 0
      ? []
      : indexer
          .select(columns)
          .from(transfers)
          .where(
            and(
              inArray(transfers.collectionId, anyUuids),
              inArray(transfers.from, givers),
              gte(transfers.timestamp, since),
            ),
          ),
  ]);
  const candidates: MatchTransfer[] = [...specific, ...copies];
  const usedRows =
    candidates.length === 0
      ? []
      : await db
          .select({ transferId: tradeLeg.transferId })
          .from(tradeLeg)
          .where(inArray(tradeLeg.transferId, unique(candidates.map((t) => t.id))));
  const used = new Set(usedRows.flatMap((row) => (row.transferId ? [row.transferId] : [])));
  return matchLegs(matchLegsInput, candidates, used);
}
