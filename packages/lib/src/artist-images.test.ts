import { describe, expect, test } from "bun:test";

import { artistImageSources, withMirroredImages } from "./artist-images";

const artists = [
  {
    name: "tripleS",
    logoImageUrl: "https://static.cosmo.fans/logo.png",
    artistMembers: [
      { name: "SeoYeon", profileImageUrl: "https://static.cosmo.fans/a.jpg" },
      { name: "HyeRin", profileImageUrl: "" },
      { name: "JiWoo", profileImageUrl: "https://media.example/artist-images/b.webp" },
    ],
  },
  {
    name: "artms",
    logoImageUrl: "https://static.cosmo.fans/logo.png",
    artistMembers: [{ name: "HeeJin", profileImageUrl: "https://static.cosmo.fans/a.jpg" }],
  },
];

describe("artistImageSources", () => {
  test("lists each image once, without empty ones", () => {
    expect(artistImageSources(artists, {}, "https://media.example/")).toEqual([
      "https://static.cosmo.fans/logo.png",
      "https://static.cosmo.fans/a.jpg",
    ]);
  });

  test("reads a swapped image back as its source", () => {
    expect(
      artistImageSources(
        artists,
        { "https://static.cosmo.fans/b.jpg": "https://media.example/artist-images/b.webp" },
        "https://media.example/",
      ),
    ).toEqual([
      "https://static.cosmo.fans/logo.png",
      "https://static.cosmo.fans/a.jpg",
      "https://static.cosmo.fans/b.jpg",
    ]);
  });

  test("lists a source once when the list shows it both raw and swapped", () => {
    const mixed = [
      {
        logoImageUrl: "",
        artistMembers: [
          { profileImageUrl: "https://static.cosmo.fans/a.jpg" },
          { profileImageUrl: "https://media.example/artist-images/a.webp" },
        ],
      },
    ];
    expect(
      artistImageSources(
        mixed,
        { "https://static.cosmo.fans/a.jpg": "https://media.example/artist-images/a.webp" },
        "https://media.example/",
      ),
    ).toEqual(["https://static.cosmo.fans/a.jpg"]);
  });
});

describe("withMirroredImages", () => {
  test("swaps mirrored images and keeps the rest", () => {
    const result = withMirroredImages(artists, {
      "https://static.cosmo.fans/a.jpg": "https://media.example/artist-images/a.webp",
    });
    expect(result[0]?.logoImageUrl).toBe("https://static.cosmo.fans/logo.png");
    expect(result[0]?.artistMembers.map((m) => m.profileImageUrl)).toEqual([
      "https://media.example/artist-images/a.webp",
      "",
      "https://media.example/artist-images/b.webp",
    ]);
    expect(result[1]?.artistMembers[0]?.profileImageUrl).toBe(
      "https://media.example/artist-images/a.webp",
    );
  });

  test("keeps every other field", () => {
    const [first] = withMirroredImages(artists, {});
    expect(first?.name).toBe("tripleS");
    expect(first?.artistMembers[0]?.name).toBe("SeoYeon");
  });
});
