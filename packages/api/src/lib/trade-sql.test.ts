import { describe, expect, test } from "bun:test";

import { type SQL, sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { offersSwaps, openToOf } from "../schemas/open-to";
import { tagsOf } from "../schemas/trade-post";
import {
  TAG_WHERE,
  byOpenToSql,
  offersSwapsSql,
  onTradeRowsSql,
  postRowSql,
  postStateSql,
  sideOnTradeSql,
} from "./trade-sql";

const render = (q: SQL) => new PgDialect().sqlToQuery(q);
// Whitespace is formatting, not meaning: collapse it so the pinned text stays on one line.
const flat = (q: SQL) => render(q).sql.replace(/\s+/g, " ");

describe("offersSwaps and offersSwapsSql", () => {
  test("a have list, or a sale list that takes swaps", () => {
    const rows = [
      ["have", true, true],
      ["have", false, true],
      ["want", true, false],
      ["want", false, false],
      ["sale", true, true],
      ["sale", false, false],
    ] as const;
    for (const [listType, takesSwaps, expected] of rows) {
      expect(offersSwaps({ listType, takesSwaps })).toBe(expected);
    }
    expect(render(offersSwapsSql("l")).sql).toBe(
      "(l.list_type = 'have' OR (l.list_type = 'sale' AND l.takes_swaps))",
    );
  });
});

describe("openToOf and byOpenToSql", () => {
  test("not matching have lists reads buying, then sale lists decide both", () => {
    const rows = [
      [{ matchHave: true, matchSale: false }, "swaps"],
      [{ matchHave: true, matchSale: true }, "both"],
      [{ matchHave: false, matchSale: true }, "buying"],
      [{ matchHave: false, matchSale: false }, "buying"],
    ] as const;
    for (const [flags, expected] of rows) expect(openToOf(flags)).toBe(expected);
    expect(
      flat(byOpenToSql("t", { buying: sql.raw("B"), both: sql.raw("H"), swaps: sql.raw("T") })),
    ).toBe("CASE WHEN NOT t.match_have THEN B WHEN t.match_sale THEN H ELSE T END");
  });
});

describe("tagsOf and TAG_WHERE", () => {
  type Row = {
    type: "have" | "want" | "sale";
    match_have?: boolean;
    match_sale?: boolean;
    takes_swaps?: boolean;
    partner_id?: number;
    partner_match_have?: boolean;
    partner_match_sale?: boolean;
  };
  const SWAPS = { match_have: true, match_sale: false };
  const BOTH = { match_have: true, match_sale: true };
  const BUYING = { match_have: false, match_sale: true };
  const partner = (f: { match_have: boolean; match_sale: boolean }) => ({
    partner_id: 2,
    partner_match_have: f.match_have,
    partner_match_sale: f.match_sale,
  });

  // A paired have or sale row reads its want side from the partner's flags, as postsCte does.
  const sidesOf = (row: Row): Parameters<typeof tagsOf>[0] => {
    const flags = (have: boolean | undefined, sale: boolean | undefined) => ({
      matchHave: have ?? true,
      matchSale: sale ?? false,
    });
    if (row.type === "want") {
      return { have: null, sale: null, want: flags(row.match_have, row.match_sale) };
    }
    const want =
      row.partner_id === undefined ? null : flags(row.partner_match_have, row.partner_match_sale);
    return row.type === "have"
      ? { have: {}, sale: null, want }
      : { have: null, sale: { takesSwaps: row.takes_swaps ?? false }, want };
  };

  const rows: [string, Row, string[]][] = [
    ["have alone", { type: "have" }, ["wtt"]],
    ["have + swaps want", { type: "have", ...partner(SWAPS) }, ["wtt"]],
    ["have + both want", { type: "have", ...partner(BOTH) }, ["wtt", "wtb"]],
    ["have + pre-rule buying want", { type: "have", ...partner(BUYING) }, ["wtt", "wtb"]],
    ["want alone, swaps", { type: "want", ...SWAPS }, ["wtt"]],
    ["want alone, both", { type: "want", ...BOTH }, ["wtt", "wtb"]],
    ["want alone, buying", { type: "want", ...BUYING }, ["wtb"]],
    ["sale", { type: "sale" }, ["wts"]],
    ["sale taking swaps", { type: "sale", takes_swaps: true }, ["wts", "wtt"]],
    ["sale + buying want", { type: "sale", ...partner(BUYING) }, ["wts", "wtb"]],
    [
      "sale taking swaps + both want",
      { type: "sale", takes_swaps: true, ...partner(BOTH) },
      ["wts", "wtt", "wtb"],
    ],
  ];

  test("each tag's rows", () => {
    for (const [name, row, tags] of rows) {
      expect({ name, tags: tagsOf(sidesOf(row)) }).toEqual({ name, tags } as never);
    }
    expect(flat(TAG_WHERE.wtt)).toBe(
      "(posts.type = 'have' OR (posts.type = 'sale' AND posts.takes_swaps) OR (posts.type = 'want' AND posts.match_have))",
    );
    expect(flat(TAG_WHERE.wtb)).toBe(
      "( (posts.type = 'want' AND (posts.match_sale OR NOT posts.match_have)) OR (posts.type IN ('have', 'sale') AND posts.partner_id IS NOT NULL AND (coalesce(posts.partner_match_sale, false) OR NOT coalesce(posts.partner_match_have, true))) )",
    );
    expect(flat(TAG_WHERE.wts)).toBe("posts.type = 'sale'");
  });
});

describe("postRowOf and postRowSql", () => {
  test("the lowest row a list leads, else the lowest it is the want list of", () => {
    expect(flat(postRowSql("l"))).toBe(
      "coalesce((SELECT min(post_row.id) FROM trade_post post_row WHERE post_row.lead_list_id = l.id), (SELECT min(post_row.id) FROM trade_post post_row WHERE post_row.want_list_id = l.id))",
    );
  });
});

describe("onTradeRowsSql, sideOnTradeSql and postStateSql", () => {
  test("one row per list side on Trade, the post's Open to by list type", () => {
    expect(flat(onTradeRowsSql(sql`(matchable l)`))).toBe(
      "SELECT l.id, l.user_id, l.list_type, CASE WHEN l.list_type = 'want' THEN tp.match_sale ELSE l.match_sale END AS match_sale, CASE WHEN l.list_type = 'want' THEN tp.match_have ELSE l.match_have END AS match_have, CASE WHEN l.list_type = 'sale' THEN tp.takes_swaps ELSE l.takes_swaps END AS takes_swaps, side.bumped_at, l.updated_at, l.created_at FROM trade_post tp CROSS JOIN LATERAL (VALUES (tp.lead_list_id, tp.lead_on_trade, tp.lead_bumped_at), (tp.want_list_id, tp.want_on_trade, tp.want_bumped_at) ) side(list_id, on_trade, bumped_at) JOIN lists l ON l.id = side.list_id WHERE side.on_trade AND (matchable l)",
    );
  });

  test("a list with a side on Trade", () => {
    expect(flat(sideOnTradeSql("l"))).toBe(
      "EXISTS (SELECT 1 FROM trade_post side_row WHERE (side_row.lead_list_id = l.id AND side_row.lead_on_trade) OR (side_row.want_list_id = l.id AND side_row.want_on_trade))",
    );
  });

  // the row `postRowSql` names, rendered for `l`
  const row =
    "FROM (SELECT 1) state_one LEFT JOIN trade_post state_row ON state_row.id = coalesce((SELECT min(post_row.id) FROM trade_post post_row WHERE post_row.lead_list_id = l.id), (SELECT min(post_row.id) FROM trade_post post_row WHERE post_row.want_list_id = l.id)))";
  const onSide =
    "CASE WHEN state_row.lead_list_id = l.id THEN state_row.lead_on_trade ELSE state_row.want_on_trade END";

  test("the bump from the list's side whenever it is in a row, else its own", () => {
    expect(flat(postStateSql("l", "bumpedAt"))).toBe(
      `(SELECT CASE WHEN state_row.id IS NULL THEN l.bumped_at ELSE CASE WHEN state_row.lead_list_id = l.id THEN state_row.lead_bumped_at ELSE state_row.want_bumped_at END END ${row}`,
    );
  });

  test("a want list's Open to and a sale list's takes_swaps from the row only while on Trade", () => {
    expect(flat(postStateSql("l", "matchHave"))).toBe(
      `(SELECT CASE WHEN l.list_type = 'want' AND ${onSide} THEN state_row.match_have ELSE l.match_have END ${row}`,
    );
    expect(flat(postStateSql("l", "matchSale"))).toBe(
      `(SELECT CASE WHEN l.list_type = 'want' AND ${onSide} THEN state_row.match_sale ELSE l.match_sale END ${row}`,
    );
    expect(flat(postStateSql("l", "takesSwaps"))).toBe(
      `(SELECT CASE WHEN l.list_type = 'sale' AND ${onSide} THEN state_row.takes_swaps ELSE l.takes_swaps END ${row}`,
    );
  });
});
