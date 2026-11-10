import type { ListObjekt } from "@repo/lib/types/objekt";

import { type ListRuleDef, ruleLine } from "../schemas/list-rule";
import { escapeCSV } from "./csv";

const HEADERS = [
  "collection_slug",
  "collection_id",
  "season",
  "member",
  "artist",
  "class",
  "collection_no",
  "on_offline",
  "serial",
  "token_id",
  "transferable",
  "price",
  "is_qyop",
  "note",
  "rule",
  // trailing, so a reader that goes by column position still works
  "ratio",
];

type CsvEntry = Pick<
  ListObjekt,
  | "slug"
  | "collectionId"
  | "season"
  | "member"
  | "artist"
  | "class"
  | "collectionNo"
  | "onOffline"
  | "price"
  | "isQyop"
  | "note"
  | "ratio"
> & { serial?: number | null; tokenId?: string | null; transferable?: boolean | null };

/**
 * A list as CSV: the header, a want list's rules first (one row each, named in the `rule`
 * column), then every entry. An entry or a rule reads its own ratio, else the list's.
 */
export function listCsv(
  entries: CsvEntry[],
  rules: (ListRuleDef & { ratio: number | null })[],
  listRatio: number | null,
) {
  const blank = Array.from({ length: HEADERS.length - 2 }, () => "");
  const ratioOf = (own: number | null) => String(own ?? listRatio ?? "");
  return [
    HEADERS.join(","),
    ...rules.map((rule) => [...blank, escapeCSV(ruleLine(rule)), ratioOf(rule.ratio)].join(",")),
    ...entries.map((e) =>
      [
        e.slug,
        e.collectionId,
        e.season,
        e.member,
        e.artist,
        e.class,
        e.collectionNo,
        e.onOffline,
        e.serial,
        e.tokenId,
        e.transferable,
        e.price,
        e.isQyop,
        e.note,
        "",
        ratioOf(e.ratio),
      ]
        .map((v) => escapeCSV(String(v ?? "")))
        .join(","),
    ),
  ].join("\n");
}
