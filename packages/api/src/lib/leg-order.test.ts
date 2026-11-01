import { describe, expect, test } from "bun:test";

import { legInsertOrder } from "./leg-order";

const ids = (items: { objektId: string | null }[]) => items.map((item) => item.objektId);

describe("legInsertOrder", () => {
  test("specific objekts by id, any-copy legs last", () => {
    const items = [{ objektId: null }, { objektId: "30" }, { objektId: "100" }, { objektId: "2" }];
    expect(ids(legInsertOrder(items))).toEqual(["100", "2", "30", null]);
  });

  test("two accepts over the same objekts get one order, whatever order they hold them in", () => {
    const one = [{ objektId: "7" }, { objektId: null }, { objektId: "3" }, { objektId: "5" }];
    const other = [{ objektId: "5" }, { objektId: "3" }, { objektId: null }, { objektId: "7" }];
    expect(ids(legInsertOrder(one))).toEqual(ids(legInsertOrder(other)));
  });

  test("any-copy legs keep their order among themselves", () => {
    const items = [
      { objektId: null, slug: "b" },
      { objektId: "1", slug: "x" },
      { objektId: null, slug: "a" },
    ];
    expect(legInsertOrder(items).map((item) => item.slug)).toEqual(["x", "b", "a"]);
  });

  test("leaves its input alone", () => {
    const items = [{ objektId: "2" }, { objektId: "1" }];
    legInsertOrder(items);
    expect(ids(items)).toEqual(["2", "1"]);
  });
});
