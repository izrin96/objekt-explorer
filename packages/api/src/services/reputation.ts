import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import { toReputation } from "../lib/offer-rules";
import { unique } from "../lib/unique";
import { type Reputation, reputationKey, reputationSchema } from "../schemas/reputation";
import { redis } from "./redis";

const TTL_SECONDS = 600;

type Row = { id: string; since: string; verified: number; positive: number; negative: number };

/** Computed from rows in one grouped read for the users not cached; never a stored counter. */
async function computeReputation(userIds: string[]) {
  const ids = sql.param(userIds);
  const result = await db.execute<Row>(sql`
    WITH done AS (
      SELECT id, count(*)::int AS n FROM (
        SELECT user_a AS id FROM trade WHERE status = 'completed' AND user_a = ANY(${ids}::text[])
        UNION ALL
        SELECT user_b FROM trade WHERE status = 'completed' AND user_b = ANY(${ids}::text[])
      ) t GROUP BY id
    ),
    rated AS (
      SELECT to_user_id AS id,
        count(*) FILTER (WHERE rating = 'positive')::int AS positive,
        count(*) FILTER (WHERE rating = 'negative')::int AS negative
      FROM trade_feedback WHERE to_user_id = ANY(${ids}::text[])
      GROUP BY to_user_id
    )
    SELECT u.id, to_char(u.created_at, 'YYYY-MM') AS since,
      coalesce(done.n, 0) AS verified,
      coalesce(rated.positive, 0) AS positive,
      coalesce(rated.negative, 0) AS negative
    FROM "user" u
    LEFT JOIN done ON done.id = u.id
    LEFT JOIN rated ON rated.id = u.id
    WHERE u.id = ANY(${ids}::text[])
  `);
  return new Map(result.rows.map(({ id, ...row }) => [id, toReputation(row)]));
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Cached per user for 10 minutes; the verifier and `offer.rate` delete the key on change. */
export async function reputationOf(userIds: string[]): Promise<Map<string, Reputation>> {
  const ids = unique(userIds);
  const found = new Map<string, Reputation>();
  if (ids.length === 0) return found;

  const cached = (await redis.send("MGET", ids.map(reputationKey))) as (string | null)[];
  const missing: string[] = [];
  ids.forEach((id, i) => {
    const parsed = cached[i] ? reputationSchema.safeParse(parseJson(cached[i])) : null;
    if (parsed?.success) found.set(id, parsed.data);
    else missing.push(id);
  });
  if (missing.length === 0) return found;

  const fresh = await computeReputation(missing);
  await Promise.all(
    [...fresh].map(([id, reputation]) =>
      redis.set(reputationKey(id), JSON.stringify(reputation), "EX", TTL_SECONDS),
    ),
  );
  for (const [id, reputation] of fresh) found.set(id, reputation);
  return found;
}

export async function forgetReputation(userIds: string[]) {
  if (userIds.length > 0) await redis.send("DEL", unique(userIds).map(reputationKey));
}
