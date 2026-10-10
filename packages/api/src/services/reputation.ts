import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import { toReputation } from "../lib/offer-rules";
import { unique } from "../lib/unique";
import { type Reputation, reputationKey, reputationSchema } from "../schemas/reputation";
import { redis } from "./redis";

const TTL_SECONDS = 600;

type Row = {
  id: string;
  since: string;
  verified: number;
  unfinished: number;
  positive: number;
  negative: number;
};

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
    fault AS (
      SELECT t.id AS trade_id,
        CASE
          WHEN a.owes AND NOT b.owes THEN t.user_a
          WHEN b.owes AND NOT a.owes THEN t.user_b
        END AS culprit
      FROM trade t
      CROSS JOIN LATERAL (
        SELECT coalesce(bool_or(l.verified_at IS NULL), false) AS owes
        FROM trade_leg l WHERE l.trade_id = t.id AND l.from_user_id = t.user_a
      ) a
      CROSS JOIN LATERAL (
        SELECT coalesce(bool_or(l.verified_at IS NULL), false) AS owes
        FROM trade_leg l WHERE l.trade_id = t.id AND l.from_user_id = t.user_b
      ) b
      WHERE t.status = 'failed'
    ),
    linked AS (
      SELECT user_id AS id, array_agg(lower(address::text)) AS addresses
      FROM user_address WHERE user_id = ANY(${ids}::text[])
      GROUP BY user_id
    ),
    unfinished AS (
      SELECT id, count(*)::int AS n FROM (
        SELECT DISTINCT f.trade_id, u.id
        FROM fault f
        CROSS JOIN unnest(${ids}::text[]) AS u(id)
        LEFT JOIN linked ON linked.id = u.id
        WHERE f.culprit IS NOT NULL AND (
          f.culprit = u.id OR EXISTS (
            SELECT 1 FROM trade_leg l
            WHERE l.trade_id = f.trade_id AND l.from_user_id = f.culprit
              AND l.from_addresses && linked.addresses
          )
        )
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
      coalesce(unfinished.n, 0) AS unfinished,
      coalesce(rated.positive, 0) AS positive,
      coalesce(rated.negative, 0) AS negative
    FROM "user" u
    LEFT JOIN done ON done.id = u.id
    LEFT JOIN unfinished ON unfinished.id = u.id
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
