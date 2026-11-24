import { describe, expect, test } from "bun:test";

import { type SQL, sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { offersSwaps, openToOf } from "../schemas/open-to";
import { tagsOf } from "../schemas/trade-post";
import { sideStateOf } from "./trade-post-state";
import {
  TAG_WHERE,
  byOpenToSql,
  hiddenRowAtSql,
  hiddenRowsSql,
  listPostSql,
  listTradeStateSql,
  offersSwapsSql,
  onTradeRowsSql,
  postRowSql,
  personBumpSql,
  postLabelSql,
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
      "SELECT l.id, l.user_id, l.list_type, CASE WHEN l.list_type = 'want' THEN tp.match_sale ELSE l.match_sale END AS match_sale, CASE WHEN l.list_type = 'want' THEN tp.match_have ELSE l.match_have END AS match_have, CASE WHEN l.list_type = 'sale' THEN tp.takes_swaps ELSE l.takes_swaps END AS takes_swaps, side.bumped_at, l.updated_at, l.created_at, tp.id AS post_id, side.side FROM trade_post tp CROSS JOIN LATERAL (VALUES (tp.lead_list_id, tp.lead_on_trade, tp.lead_bumped_at, 'lead'), (tp.want_list_id, tp.want_on_trade, tp.want_bumped_at, 'want') ) side(list_id, on_trade, bumped_at, side) JOIN lists l ON l.id = side.list_id WHERE side.on_trade AND (matchable l)",
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

  test("sideStateOf takes from the row exactly what sideStateSql's CASE does", () => {
    // per list type and side state: whether each flag comes from the row
    const rows = [
      ["want", true, { matchHave: true, matchSale: true, takesSwaps: false }],
      ["want", false, { matchHave: false, matchSale: false, takesSwaps: false }],
      ["sale", true, { matchHave: false, matchSale: false, takesSwaps: true }],
      ["sale", false, { matchHave: false, matchSale: false, takesSwaps: false }],
      ["have", true, { matchHave: false, matchSale: false, takesSwaps: false }],
    ] as const;
    for (const [listType, onTrade, fromRow] of rows) {
      const list = { id: 1, listType, matchHave: false, matchSale: false, takesSwaps: false };
      const state = sideStateOf(
        {
          id: 9,
          leadListId: 1,
          wantListId: null,
          leadOnTrade: onTrade,
          wantOnTrade: false,
          leadBumpedAt: null,
          wantBumpedAt: null,
          matchHave: true,
          matchSale: true,
          takesSwaps: true,
        },
        list,
      );
      expect({
        matchHave: state.matchHave,
        matchSale: state.matchSale,
        takesSwaps: state.takesSwaps,
      }).toEqual(fromRow);
    }
  });

  test("a list's side in one row: the row's value while on Trade, else the list's own", () => {
    expect(flat(sideStateSql("r", "l", "onTrade"))).toBe(`(${onSide})`);
    expect(flat(sideStateSql("r", "l", "bumpedAt"))).toBe(
      "(CASE WHEN r.lead_list_id = l.id THEN r.lead_bumped_at ELSE r.want_bumped_at END)",
    );
    expect(flat(sideStateSql("r", "l", "matchHave"))).toBe(
      `(CASE WHEN l.list_type = 'want' AND ${onSide} THEN r.match_have ELSE l.match_have END)`,
    );
    expect(flat(sideStateSql("r", "l", "matchSale"))).toBe(
      `(CASE WHEN l.list_type = 'want' AND ${onSide} THEN r.match_sale ELSE l.match_sale END)`,
    );
    expect(flat(sideStateSql("r", "l", "takesSwaps"))).toBe(
      `(CASE WHEN l.list_type = 'sale' AND ${onSide} THEN r.takes_swaps ELSE l.takes_swaps END)`,
    );
  });

  test("a list read by itself: the union of its sides on Trade, else its own", () => {
    expect(flat(listTradeStateSql("l", "bumpedAt"))).toBe(
      `(SELECT max(CASE WHEN st.lead_list_id = l.id THEN st.lead_bumped_at ELSE st.want_bumped_at END) ${sides})`,
    );
    expect(flat(listTradeStateSql("l", "matchHave"))).toBe(
      `(CASE WHEN l.list_type = 'want' THEN coalesce((SELECT bool_or(st.match_have) ${sides}), l.match_have) ELSE l.match_have END)`,
    );
    expect(flat(listTradeStateSql("l", "matchSale"))).toBe(
      `(CASE WHEN l.list_type = 'want' THEN coalesce((SELECT bool_or(st.match_sale) ${sides}), l.match_sale) ELSE l.match_sale END)`,
    );
    expect(flat(listTradeStateSql("l", "takesSwaps"))).toBe(
      `(CASE WHEN l.list_type = 'sale' THEN coalesce((SELECT bool_or(st.takes_swaps) ${sides}), l.takes_swaps) ELSE l.takes_swaps END)`,
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

describe("postLabelSql", () => {
  test("pads to 3 digits and never cuts a longer number", () => {
    expect(flat(postLabelSql("tp"))).toBe(
      "('#P-' || lpad(tp.number::text, greatest(3, length(tp.number::text)), '0'))",
    );
  });
});
