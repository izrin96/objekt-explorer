import { describe, expect, test } from "bun:test";

import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { collectionNoAfter, collectionNoOrder } from "./picker-sort-sql";

const render = (q: ReturnType<typeof collectionNoOrder>) => {
  const { sql: text, params } = new PgDialect().sqlToQuery(q);
  return { text: text.replace(/\s+/g, " "), params };
};
const cols = {
  no: sql.raw("c.no"),
  rank: sql.raw("c.rank"),
  received: sql.raw("g.received"),
  slug: sql.raw("c.slug"),
};

describe("collectionNoOrder", () => {
  test("number by code unit, roster rank, then newest received and slug descending", () => {
    expect(render(collectionNoOrder(cols))).toEqual({
      text: 'c.no COLLATE "C" ASC, c.rank ASC, g.received DESC, c.slug DESC',
      params: [],
    });
  });
});

describe("collectionNoAfter", () => {
  test("keeps what sorts after the cursor, binding each value", () => {
    const cursor = {
      sort: "collectionNo" as const,
      no: "101Z",
      rank: 3,
      receivedAt: "2026-10-17 00:00:00.123456+00",
      slug: "atom01-seoyeon-101z",
    };
    expect(render(collectionNoAfter(cols, cursor))).toEqual({
      text: '(c.no COLLATE "C" > $1::text OR (c.no COLLATE "C" = $2::text AND (c.rank > $3::int OR (c.rank = $4::int AND (g.received, c.slug) < ($5::timestamptz, $6::text)))))',
      params: ["101Z", "101Z", 3, 3, cursor.receivedAt, cursor.slug],
    });
  });
});
