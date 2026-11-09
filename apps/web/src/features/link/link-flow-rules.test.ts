import { describe, expect, test } from "bun:test";

import type { CosmoPublicUser } from "@repo/cosmo/types/user";

import { codeInput, hasProfile } from "./link-flow-rules";

const found = {
  id: 7,
  nickname: "nick",
  profileImageUrl: "",
  address: "0xabc",
  userProfiles: [
    { artistId: "artms", artistName: "artms", image: { original: "", thumbnail: "" } },
  ],
} as CosmoPublicUser;

describe("hasProfile", () => {
  test("matches an artist id ignoring case", () => {
    expect(hasProfile(found, "artms")).toBe(true);
    expect(
      hasProfile(
        { ...found, userProfiles: [{ ...found.userProfiles[0]!, artistId: "ARTMS" as never }] },
        "artms",
      ),
    ).toBe(true);
  });

  test("is false for an artist the user has no profile for", () => {
    expect(hasProfile(found, "idntt")).toBe(false);
    expect(hasProfile({ ...found, userProfiles: [] }, "artms")).toBe(false);
  });
});

describe("codeInput", () => {
  test("picks the fields the code request needs", () => {
    expect(codeInput(found, "artms")).toEqual({
      address: "0xabc",
      cosmoId: 7,
      nickname: "nick",
      artistId: "artms",
    });
  });
});
