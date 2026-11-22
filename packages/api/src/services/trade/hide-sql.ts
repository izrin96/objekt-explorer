import { sql } from "drizzle-orm";

import { postsCte } from "./feed/query";

/** `hidePost`'s statement: the named post's row, among another account's posts on Trade, idle or not. */
export const hidePostSql = (viewerId: string, postId: number) => sql`
  WITH ${postsCte}
  INSERT INTO hidden_trade_post (user_id, post_id)
  SELECT ${viewerId}, min(posts.post_id) FROM posts
  WHERE posts.post_id = ${postId} AND posts.user_id <> ${viewerId}
  HAVING min(posts.post_id) IS NOT NULL
  ON CONFLICT DO NOTHING
  RETURNING post_id
`;

/** `unhidePost`'s statement: the viewer's hide of the named row. */
export const unhidePostSql = (viewerId: string, postId: number) => sql`
  DELETE FROM hidden_trade_post
  WHERE user_id = ${viewerId} AND post_id = ${postId}
`;
