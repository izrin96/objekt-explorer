import { describe, expect, test } from "bun:test";

import { type SQL, sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { offersSwaps, openToOf } from "../schemas/open-to";
import { tagsOf } from "../schemas/trade-post";
import { listStateOf, type PostRow, sideStateOf } from "./trade-post-state";
import {
  TAG_WHERE,
  byOpenToSql,
  hiddenRowAtSql,
  hiddenRowsSql,
  listPostSql,
  listSideFlagsSql,
  listTradeStateSql,
  offersSwapsSql,
  onTradeRowsSql,
  postRowSql,
  personBumpSql,
  sideOnTradeSql,
  sideStateSql,
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

describe("onTradeRowsSql, sideOnTradeSql and personBumpSql", () => {
  test("one row per list side on Trade, the post's Open to by list type", () => {
    expect(flat(onTradeRowsSql(sql`(matchable l)`))).toBe(
      "SELECT l.id, l.user_id, l.list_type, CASE WHEN l.list_type = 'want' THEN tp.match_sale ELSE true END AS match_sale, CASE WHEN l.list_type = 'want' THEN tp.match_have ELSE true END AS match_have, CASE WHEN l.list_type = 'sale' THEN tp.takes_swaps ELSE false END AS takes_swaps, side.bumped_at, l.updated_at, l.created_at, tp.id AS post_id, side.side FROM trade_post tp CROSS JOIN LATERAL (VALUES (tp.lead_list_id, tp.lead_on_trade, tp.lead_bumped_at, 'lead'), (tp.want_list_id, tp.want_on_trade, tp.want_bumped_at, 'want') ) side(list_id, on_trade, bumped_at, side) JOIN lists l ON l.id = side.list_id WHERE side.on_trade AND (matchable l)",
    );
  });

  test("a list with a side on Trade", () => {
    expect(flat(sideOnTradeSql("l"))).toBe(
      "EXISTS (SELECT 1 FROM trade_post side_row WHERE (side_row.lead_list_id = l.id AND side_row.lead_on_trade) OR (side_row.want_list_id = l.id AND side_row.want_on_trade))",
    );
  });

  test("a person's last bump: the latest of every side of their rows, on Trade or not", () => {
    const q = render(personBumpSql("u1"));
    expect(q.sql.replace(/\s+/g, " ")).toBe(
      "(SELECT max(greatest(tp.lead_bumped_at, tp.want_bumped_at)) FROM trade_post tp WHERE tp.user_id = $1)",
    );
    expect(q.params).toEqual(["u1"]);
  });
});

describe("sideStateSql, listTradeStateSql and listPostSql", () => {
  const onSide = "CASE WHEN r.lead_list_id = l.id THEN r.lead_on_trade ELSE r.want_on_trade END";
  // the rows in which `l` has a side on Trade
  const sides =
    "FROM trade_post st WHERE (st.lead_list_id = l.id AND st.lead_on_trade) OR (st.want_list_id = l.id AND st.want_on_trade)";
  const DEFAULTS = { matchHave: true, matchSale: true, takesSwaps: false };
  // every value differs from the defaults, so the table can tell the row from a default
  const ROW = { matchHave: false, matchSale: false, takesSwaps: true };
  const postRow = (over: Partial<PostRow>): PostRow => ({
    id: 9,
    leadListId: 1,
    wantListId: null,
    leadOnTrade: true,
    wantOnTrade: false,
    leadBumpedAt: null,
    wantBumpedAt: null,
    ...ROW,
    ...over,
  });

  test("sideStateOf takes from the row exactly what sideStateSql's CASE does", () => {
    // per list type and side state: which flags come from the row (on Trade or off), the rest default
    const rows = [
      ["want", true, { matchHave: false, matchSale: false, takesSwaps: false }],
      ["want", false, { matchHave: false, matchSale: false, takesSwaps: false }],
      ["sale", true, { matchHave: true, matchSale: true, takesSwaps: true }],
      ["sale", false, { matchHave: true, matchSale: true, takesSwaps: true }],
      ["have", true, DEFAULTS],
      ["have", false, DEFAULTS],
    ] as const;
    for (const [listType, onTrade, expected] of rows) {
      const state = sideStateOf(postRow({ leadOnTrade: onTrade }), { id: 1, listType });
      expect({
        listType,
        onTrade,
        matchHave: state.matchHave,
        matchSale: state.matchSale,
        takesSwaps: state.takesSwaps,
      }).toEqual({ listType, onTrade, ...expected });
    }
  });

  test("a list's side in one row: the row's value for its type, on Trade or off, else the default", () => {
    expect(flat(sideStateSql("r", "l", "onTrade"))).toBe(`(${onSide})`);
    expect(flat(sideStateSql("r", "l", "bumpedAt"))).toBe(
      "(CASE WHEN r.lead_list_id = l.id THEN r.lead_bumped_at ELSE r.want_bumped_at END)",
    );
    expect(flat(sideStateSql("r", "l", "matchHave"))).toBe(
      "(CASE WHEN l.list_type = 'want' THEN r.match_have ELSE true END)",
    );
    expect(flat(sideStateSql("r", "l", "matchSale"))).toBe(
      "(CASE WHEN l.list_type = 'want' THEN r.match_sale ELSE true END)",
    );
    expect(flat(sideStateSql("r", "l", "takesSwaps"))).toBe(
      "(CASE WHEN l.list_type = 'sale' THEN r.takes_swaps ELSE false END)",
    );
  });

  test("listStateOf reads the tiers listTradeStateSql does", () => {
    const want = { id: 2, listType: "want" as const };
    const sale = { id: 1, listType: "sale" as const };
    const swapsOnly = { matchHave: true, matchSale: false, takesSwaps: false };
    const buyingOnly = { matchHave: false, matchSale: true, takesSwaps: false };
    const cases: [string, PostRow[], typeof want | typeof sale, typeof DEFAULTS][] = [
      [
        "on Trade: its on sides only",
        [
          postRow({ id: 10, leadListId: 3, wantListId: 2, wantOnTrade: true, ...swapsOnly }),
          postRow({ id: 11, leadListId: 2, leadOnTrade: false, ...buyingOnly }),
        ],
        want,
        { ...swapsOnly, takesSwaps: false },
      ],
      [
        "off Trade in a row: that row",
        [postRow({ id: 11, leadListId: 2, leadOnTrade: false, ...buyingOnly })],
        want,
        buyingOnly,
      ],
      [
        "off Trade in two rows: their union",
        [
          postRow({ id: 10, leadListId: 3, wantListId: 2, ...swapsOnly }),
          postRow({ id: 11, leadListId: 2, leadOnTrade: false, ...buyingOnly }),
        ],
        want,
        { matchHave: true, matchSale: true, takesSwaps: false },
      ],
      ["in no row: the defaults", [postRow({ id: 12, leadListId: 3 })], want, DEFAULTS],
      [
        "a sale lead off Trade: its row's takes_swaps",
        [postRow({ id: 13, leadListId: 1, leadOnTrade: false })],
        sale,
        { matchHave: true, matchSale: true, takesSwaps: true },
      ],
    ];
    for (const [name, rows, list, expected] of cases) {
      expect({ name, state: listStateOf(rows, list) }).toEqual({ name, state: expected });
    }
  });

  test("a list read by itself: the union of its sides on Trade, else of every side, else the default", () => {
    expect(flat(listTradeStateSql("l", "bumpedAt"))).toBe(
      `(SELECT max(CASE WHEN st.lead_list_id = l.id THEN st.lead_bumped_at ELSE st.want_bumped_at END) ${sides})`,
    );
    const tiers = (type: string, column: string, fallback: string) =>
      `(CASE WHEN l.list_type = '${type}' THEN coalesce((SELECT coalesce(bool_or(st.${column}) FILTER (WHERE (st.lead_list_id = l.id AND st.lead_on_trade) OR (st.want_list_id = l.id AND st.want_on_trade)), bool_or(st.${column})) FROM trade_post st WHERE st.lead_list_id = l.id OR st.want_list_id = l.id), ${fallback}) ELSE ${fallback} END)`;
    expect(flat(listTradeStateSql("l", "matchHave"))).toBe(tiers("want", "match_have", "true"));
    expect(flat(listTradeStateSql("l", "matchSale"))).toBe(tiers("want", "match_sale", "true"));
    expect(flat(listTradeStateSql("l", "takesSwaps"))).toBe(tiers("sale", "takes_swaps", "false"));
  });

  test("each list's side flags as one set, listTradeStateSql's first two tiers", () => {
    const tiers = (column: string) =>
      `coalesce(bool_or(tp.${column}) FILTER (WHERE side.on_trade), bool_or(tp.${column})) AS ${column}`;
    expect(flat(listSideFlagsSql(sql`tp.user_id = 'u1'`))).toBe(
      `SELECT side.id, ${tiers("match_have")}, ${tiers("match_sale")}, ${tiers("takes_swaps")} FROM trade_post tp CROSS JOIN LATERAL (VALUES (tp.lead_list_id, tp.lead_on_trade), (tp.want_list_id, tp.want_on_trade)) AS side(id, on_trade) WHERE side.id IS NOT NULL AND tp.user_id = 'u1' GROUP BY side.id`,
    );
  });

  test("a list's post: the lowest row with its side on Trade, else postRowSql's", () => {
    expect(flat(listPostSql("l"))).toBe(
      `coalesce((SELECT min(st.id) ${sides}), ${flat(postRowSql("l"))})`,
    );
  });
});

describe("hiddenRowsSql and hiddenRowAtSql", () => {
  test("a viewer's hides by row, through the primary key", () => {
    const set = render(hiddenRowsSql("u1"));
    expect(set.sql).toBe(
      "SELECT hidden_row.post_id FROM hidden_trade_post hidden_row WHERE hidden_row.user_id = $1",
    );
    expect(set.params).toEqual(["u1"]);
    expect(flat(hiddenRowAtSql(sql.raw("p.user_id"), sql.raw("p.post_id")))).toBe(
      "(SELECT hidden_row.created_at FROM hidden_trade_post hidden_row WHERE hidden_row.user_id = p.user_id AND hidden_row.post_id = p.post_id)",
    );
  });
});
