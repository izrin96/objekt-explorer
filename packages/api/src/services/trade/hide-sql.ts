import { type SQL, sql } from "drizzle-orm";

import type { PostRef } from "../../schemas/trade";
import { postsCte } from "./feed/query";
import { hidesOfSql } from "./lists";

const isRowSql = (id: number) =>
  sql`EXISTS (SELECT 1 FROM trade_post named_row WHERE named_row.id = ${id})`;

/**
 * `resolvePostRef` (`schemas/trade.ts`) as a condition: `byRow` for the first of the ref's ids that
 * is a `trade_post` row, else `byList` for the old field. Each `EXISTS` is an uncorrelated primary
 * key probe, planned once per statement.
 */
export function postRefSql(ref: PostRef, byRow: (id: number) => SQL, byList: (id: number) => SQL) {
  const whens = [ref.postId, ref.legacyId].flatMap((id) =>
    id === undefined ? [] : [sql`WHEN ${isRowSql(id)} THEN ${byRow(id)}`],
  );
  const otherwise = ref.legacyId === undefined ? sql`false` : byList(ref.legacyId);
  return sql`CASE ${sql.join(whens, sql` `)} ELSE ${otherwise} END`;
}

/**
 * `hidePost`'s statement: the named post's row, among another account's posts on Trade, idle or
 * not; a list names the lowest row among the posts it anchors.
 */
export const hidePostSql = (viewerId: string, ref: PostRef) => sql`
  WITH ${postsCte}
  INSERT INTO hidden_trade_post (user_id, post_id)
  SELECT ${viewerId}, min(posts.post_id) FROM posts
  WHERE ${postRefSql(
    ref,
    (id) => sql`posts.post_id = ${id}`,
    (id) => sql`posts.id = ${id}`,
  )} AND posts.user_id <> ${viewerId}
  HAVING min(posts.post_id) IS NOT NULL
  ON CONFLICT DO NOTHING
  RETURNING post_id
`;

/** `unhidePost`'s statement: the viewer's hide of the named row; a list names the rows holding it. */
export const unhidePostSql = (viewerId: string, ref: PostRef) => sql`
  DELETE FROM hidden_trade_post gone
  USING (VALUES (${ref.legacyId ?? null}::int)) AS named(id)
  WHERE gone.user_id = ${viewerId}
    AND ${postRefSql(
      ref,
      (id) => sql`gone.post_id = ${id}`,
      () => sql`gone.post_id IN (SELECT hp.post_id ${hidesOfSql(viewerId, "named")})`,
    )}
`;
