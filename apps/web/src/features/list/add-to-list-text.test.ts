import { describe, expect, test } from "bun:test";

import type { AddSource } from "@repo/api/schemas/list";
import { truncateAddress } from "@repo/lib/address";
import type { OwnedObjekt } from "@repo/lib/types/objekt";

import { m } from "@/paraglide/messages";

import type { AddableObjekt, AddTarget } from "./add-to-list-source";
import { addHint, profileLabel } from "./add-to-list-text";

// `m.*` returns a branded string, which `expect(...).toBe("...")` rejects.
const check = (actual: unknown) => expect(actual);

const ADDRESS = "0xAbCdEf0123456789aBcDeF0123456789AbCdEf01";

describe("profileLabel", () => {
  test("a named profile is @nickname", () => {
    check(profileLabel([{ address: ADDRESS, nickname: "nick" }], ADDRESS)).toBe("@nick");
  });

  test("the address matches in any letter case", () => {
    check(profileLabel([{ address: ADDRESS, nickname: "nick" }], ADDRESS.toLowerCase())).toBe(
      "@nick",
    );
  });

  test("a nickname equal to its own address is the truncated address", () => {
    const profiles = [{ address: ADDRESS, nickname: ADDRESS.toLowerCase() }];
    check(profileLabel(profiles, ADDRESS)).toBe(truncateAddress(ADDRESS));
  });

  test("an unknown address is the truncated address", () => {
    check(profileLabel([{ address: "0xother", nickname: "nick" }], ADDRESS)).toBe(
      truncateAddress(ADDRESS),
    );
  });

  test("a null or missing nickname is the truncated address", () => {
    check(profileLabel([{ address: ADDRESS, nickname: null }], ADDRESS)).toBe(
      truncateAddress(ADDRESS),
    );
    check(profileLabel([{ address: ADDRESS }], ADDRESS)).toBe(truncateAddress(ADDRESS));
  });
});

describe("addHint", () => {
  const collection = (slug: string) => ({ id: slug, slug }) as unknown as AddableObjekt;
  const token = (slug: string, serial: number) =>
    ({
      id: `${slug}-${serial}`,
      slug,
      serial,
      tokenId: `${slug}-${serial}`,
    }) as unknown as OwnedObjekt;

  const unowned: AddTarget = { objekts: [collection("a")] };
  const owned: AddTarget = { objekts: [collection("a"), token("b", 1)] };
  const profile = "@nick";
  const collections = { from: { type: "collections", slugs: ["a"] } as AddSource };
  const objekts = { from: { type: "objekts", tokenIds: ["a-1"] } as AddSource };
  const base = { target: unowned, profile, here: true, picking: false, source: null };

  test("an unbound list has no hint, whatever else is set", () => {
    const hint = addHint({
      ...base,
      target: owned,
      profile: null,
      here: false,
      picking: true,
      source: collections,
    });
    expect(hint).toBeNull();
  });

  test("not here, with an owned objekt: the profile adds its own copies", () => {
    check(addHint({ ...base, target: owned, here: false })).toBe(
      m.list_add_own_copies({ profile }),
    );
  });

  test("not here, with only unowned objekts: the profile adds every copy", () => {
    check(addHint({ ...base, here: false })).toBe(m.list_add_every_copy({ profile }));
  });

  test("picking a combined card with copies still to load says so", () => {
    const target = { ...owned, combined: true, copiesPartial: true };
    check(addHint({ ...base, target, picking: true })).toBe(m.list_add_copies_partial());
  });

  test("picking otherwise gives the copies hint", () => {
    const combined = { ...owned, combined: true };
    check(addHint({ ...base, target: combined, picking: true })).toBe(m.list_add_copies_hint());
    const partial = { ...owned, copiesPartial: true };
    check(addHint({ ...base, target: partial, picking: true })).toBe(m.list_add_copies_hint());
    check(addHint({ ...base, target: owned, picking: true })).toBe(m.list_add_copies_hint());
  });

  test("here and not picking: a collections source adds every copy", () => {
    check(addHint({ ...base, source: collections })).toBe(m.list_add_every_copy({ profile }));
  });

  test("here and not picking: an objekts source or none has no hint", () => {
    expect(addHint({ ...base, source: objekts })).toBeNull();
    expect(addHint(base)).toBeNull();
  });
});
