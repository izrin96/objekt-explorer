import { describe, expect, test } from "bun:test";

import type { ListRuleDef } from "../schemas/list-rule";
import { listCsv } from "./list-csv";

type Entry = Parameters<typeof listCsv>[0][number];

const entry: Entry = {
  slug: "yooyeon-cream02-201z",
  collectionId: "Cream02 YooYeon 201Z",
  season: "Cream02",
  member: "YooYeon",
  artist: "triples",
  class: "Special",
  collectionNo: "201Z",
  onOffline: "online",
  price: null,
  isQyop: false,
  note: null,
  ratio: null,
};

const rule: ListRuleDef & { ratio: number | null } = {
  kind: "set",
  artist: "tripleS",
  season: null,
  collectionNo: null,
  class: null,
  editions: [],
  members: [],
  prio: [],
  skipOwned: false,
  ratio: 3,
};

const lines = (csv: string) => csv.split("\n");

describe("listCsv", () => {
  test("the header keeps its column order, ratio last", () => {
    expect(lines(listCsv([], [], null))[0]).toBe(
      "collection_slug,collection_id,season,member,artist,class,collection_no,on_offline,serial,token_id,transferable,price,is_qyop,note,rule,ratio",
    );
  });

  test("an owned copy fills serial, token and transferable; an any-copy entry leaves them empty", () => {
    const [, owned, any] = lines(
      listCsv([{ ...entry, serial: 12, tokenId: "4001", transferable: true }, entry], [], null),
    );
    expect(owned).toBe(
      "yooyeon-cream02-201z,Cream02 YooYeon 201Z,Cream02,YooYeon,triples,Special,201Z,online,12,4001,true,,false,,,",
    );
    expect(any).toBe(
      "yooyeon-cream02-201z,Cream02 YooYeon 201Z,Cream02,YooYeon,triples,Special,201Z,online,,,,,false,,,",
    );
  });

  test("rules come first, named in the rule column, and each row falls back to the list's ratio", () => {
    const [, ruleRow, entryRow] = lines(listCsv([entry], [{ ...rule, ratio: null }], 2));
    expect(ruleRow).toBe(",,,,,,,,,,,,,,any tripleS,2");
    expect(entryRow!.endsWith(",2")).toBe(true);
    expect(lines(listCsv([], [rule], 2))[1]!.endsWith(",3")).toBe(true);
  });

  test("a note is escaped, a formula included", () => {
    const row = lines(listCsv([{ ...entry, price: 5, note: '=1+1, "hi"' }], [], null))[1];
    expect(row).toContain(`,5,false,"'=1+1, ""hi""",,`);
  });
});
