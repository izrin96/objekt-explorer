import { describe, expect, it } from "bun:test";

import { ownBannerKey } from "./banner-key";

const pub = "https://cdn.example.com";
const mine = "0xAbC123";

describe("ownBannerKey", () => {
  it("returns the key of an own banner, whatever the address case", () => {
    expect(ownBannerKey(`${pub}/profile-banner/0xabc123-1700000000000.jpg`, pub, mine)).toBe(
      "profile-banner/0xabc123-1700000000000.jpg",
    );
    expect(ownBannerKey(`${pub}/profile-banner/0xAbC123-1.webp`, pub, mine)).toBe(
      "profile-banner/0xAbC123-1.webp",
    );
  });

  it("keeps an older upload named after the client's file", () => {
    expect(ownBannerKey(`${pub}/profile-banner/0xabc123-1700-my-photo`, pub, mine)).toBe(
      "profile-banner/0xabc123-1700-my-photo",
    );
  });

  it("rejects a path that smuggles in another user's file", () => {
    expect(ownBannerKey(`${pub}/profile-banner/${mine}-/0xvictim-1.jpg`, pub, mine)).toBeNull();
  });

  it("rejects another address, a foreign host and odd shapes", () => {
    expect(ownBannerKey(`${pub}/profile-banner/0xvictim-1.jpg`, pub, mine)).toBeNull();
    expect(ownBannerKey(`https://evil.test/profile-banner/0xabc123-1.jpg`, pub, mine)).toBeNull();
    expect(ownBannerKey(`${pub}/profile-banner/0xabc123-1.jpg?x=1`, pub, mine)).toBeNull();
    expect(ownBannerKey(`${pub}/profile-banner/0xabc123-1.jpg/../x.jpg`, pub, mine)).toBeNull();
  });
});
