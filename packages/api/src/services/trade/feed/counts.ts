import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import { untradeableKey } from "../../../lib/trade-feed";
import { addressesByUser } from "../../../lib/trade-rank";
import { unique } from "../../../lib/unique";
import type { ListType } from "../../../schemas/list";
import { notTradeSanctioned } from "../../moderation/safety";
import { marketVersion } from "../../moderation/safety-cache";
import { getCache } from "../../redis";
import { fetchAddresses } from "../matches/holdings";
import { fetchUntradeable } from "./entries";
import { listedPost, postsCte } from "./query";

const COUNTS_TTL_SECONDS = 60;

type CountRow = {
  post_id: number;
  user_id: string;
  list_type: ListType;
  objekt_id: string | null;
};

async function computePostCounts(slug: string) {
  const result = await db.execute<CountRow>(sql`
    WITH ${postsCte}
    SELECT posts.id AS post_id, posts.user_id, t.list_type, e.objekt_id
    FROM posts
    JOIN list_entries e ON e.list_id IN (posts.id, posts.partner_id)
    JOIN on_trade t ON t.id = e.list_id
    WHERE e.collection_slug = ${slug} AND ${listedPost} AND ${notTradeSanctioned(sql`posts.user_id`)}
  `);

  const owned = result.rows.filter((row) => row.list_type !== "want");
  const refs = owned.map((row) => ({ userId: row.user_id, objektId: row.objekt_id, slug }));
  const untradeable = await fetchUntradeable(
    refs,
    addressesByUser(await fetchAddresses(unique(owned.map((row) => row.user_id)))),
  );
  const havePosts = new Set(
    owned
      .filter((row, i) => !untradeable.has(untradeableKey(row.user_id, refs[i]!)))
      .map((row) => row.post_id),
  );
  const wantPosts = new Set(
    result.rows.filter((row) => row.list_type === "want").map((row) => row.post_id),
  );
  return { have: havePosts.size, want: wantPosts.size };
}

export async function collectionPostCounts(slug: string) {
  const version = await marketVersion();
  return getCache(`trade:counts:${version}:${slug}`, COUNTS_TTL_SECONDS, () =>
    computePostCounts(slug),
  );
}
