import { describe, expect, test } from "bun:test";

import { type SQL, sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { offersSwaps, openToOf } from "../schemas/open-to";
import { tagsOf } from "../schemas/trade-post";
import { TAG_WHERE, byOpenToSql, offersSwapsSql } from "./trade-sql";

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
