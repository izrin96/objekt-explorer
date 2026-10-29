import { describe, expect, test } from "bun:test";

import { type DiscordFormatObjekt, type FormatOptions, format } from "./format";

const MEMBER_ORDER = ["SeoYeon", "HyeRin", "JiWoo", "Kaede", "Unknown"];
const SEASON_ORDER = ["Atom01", "Binary01", "Cream01", "Spring25", "Summer25"];

const OPTIONS: FormatOptions = {
  showQuantity: false,
  lowercaseCollection: false,
  bullet: false,
  showMemberEmoji: false,
  hideType: false,
  groupByMode: "none",
  style: "default",
  compareArtistMember: (a, b) => MEMBER_ORDER.indexOf(a) - MEMBER_ORDER.indexOf(b),
  compareSeason: (a, b) => SEASON_ORDER.indexOf(a) - SEASON_ORDER.indexOf(b),
};

function objekt(
  member: string,
  season: string,
  collectionNo: string,
  artist = "tripleS",
): DiscordFormatObjekt {
  return {
    slug: `${season}-${member}-${collectionNo}`.toLowerCase(),
    season,
    collectionNo,
    member,
    artist,
    collectionId: `${season} ${member} ${collectionNo}`,
    class: "First",
  };
}

function run(collections: DiscordFormatObjekt[], options: Partial<FormatOptions> = {}) {
  return format(collections, { ...OPTIONS, ...options });
}

describe("collection text", () => {
  test("repeats the season letter by the season number", () => {
    expect(run([objekt("SeoYeon", "Atom01", "101Z")])).toBe("SeoYeon A101Z");
    expect(run([objekt("SeoYeon", "Binary02", "101Z")])).toBe("SeoYeon BB101Z");
  });

  test("idntt puts the season emoji and year in front", () => {
    expect(run([objekt("Kaede", "Spring25", "101Z", "idntt")])).toBe("Kaede 🌸25 101Z");
    expect(run([objekt("Kaede", "Summer25", "202A", "idntt")])).toBe("Kaede ☀️25 202A");
  });

  test("hideType drops the last character of the number", () => {
    expect(run([objekt("SeoYeon", "Atom01", "101Z")], { hideType: true })).toBe("SeoYeon A101");
  });

  test("lowercaseCollection lowercases the collection, not the member", () => {
    expect(run([objekt("SeoYeon", "Atom01", "101Z")], { lowercaseCollection: true })).toBe(
      "SeoYeon a101z",
    );
  });
});

describe("quantity", () => {
  const twice = [objekt("SeoYeon", "Atom01", "101Z"), objekt("SeoYeon", "Atom01", "101Z")];

  test("duplicates collapse into one entry", () => {
    expect(run(twice)).toBe("SeoYeon A101Z");
  });

  test("showQuantity adds the count only above one", () => {
    expect(run(twice, { showQuantity: true })).toBe("SeoYeon A101Z (x2)");
    expect(run([objekt("SeoYeon", "Atom01", "101Z")], { showQuantity: true })).toBe(
      "SeoYeon A101Z",
    );
  });
});

describe("members", () => {
  test("members follow compareArtistMember and collections sort by text", () => {
    const rows = [
      objekt("HyeRin", "Atom01", "102Z"),
      objekt("SeoYeon", "Binary01", "101Z"),
      objekt("SeoYeon", "Atom01", "105Z"),
    ];
    expect(run(rows)).toBe("SeoYeon A105Z B101Z\nHyeRin A102Z");
  });

  test("showMemberEmoji prefixes a known member and leaves others bare", () => {
    const rows = [objekt("SeoYeon", "Atom01", "101Z"), objekt("Unknown", "Atom01", "101Z")];
    expect(run(rows, { showMemberEmoji: true })).toBe("🐶SeoYeon A101Z\nUnknown A101Z");
  });

  test("bullet prefixes each member line", () => {
    const rows = [objekt("SeoYeon", "Atom01", "101Z"), objekt("HyeRin", "Atom01", "102Z")];
    expect(run(rows, { bullet: true })).toBe("- SeoYeon A101Z\n- HyeRin A102Z");
  });

  test("no collections gives an empty string", () => {
    expect(run([])).toBe("");
    expect(run([], { groupByMode: "season" })).toBe("");
    expect(run([], { groupByMode: "season-first" })).toBe("");
  });
});

describe("group by season", () => {
  const rows = [
    objekt("SeoYeon", "Binary01", "101Z"),
    objekt("SeoYeon", "Atom01", "105Z"),
    objekt("SeoYeon", "Atom01", "102Z"),
    objekt("HyeRin", "Atom01", "103Z"),
  ];

  test("default puts the member in bold over one line per season", () => {
    expect(run(rows, { groupByMode: "season" })).toBe(
      "**SeoYeon**\nAtom01 A102Z A105Z\nBinary01 B101Z\n**HyeRin**\nAtom01 A103Z",
    );
  });

  test("default with bullet bullets the season lines", () => {
    expect(run(rows, { groupByMode: "season", bullet: true })).toBe(
      "**SeoYeon**\n- Atom01 A102Z A105Z\n- Binary01 B101Z\n**HyeRin**\n- Atom01 A103Z",
    );
  });

  test("compact keeps each member on one line", () => {
    expect(run(rows, { groupByMode: "season", style: "compact" })).toBe(
      "__SeoYeon__ **Atom01** A102Z A105Z **Binary01** B101Z\n__HyeRin__ **Atom01** A103Z",
    );
  });

  test("idntt seasons carry their emoji and drop it from the collection", () => {
    const idntt = [
      objekt("Kaede", "Summer25", "201Z", "idntt"),
      objekt("Kaede", "Spring25", "101Z", "idntt"),
    ];
    expect(run(idntt, { groupByMode: "season" })).toBe(
      "**Kaede**\n🌸Spring25 101Z\n☀️Summer25 201Z",
    );
  });
});

describe("season first", () => {
  const rows = [
    objekt("HyeRin", "Binary01", "103Z"),
    objekt("SeoYeon", "Atom01", "102Z"),
    objekt("HyeRin", "Atom01", "101Z"),
  ];

  test("default puts the season in bold over one line per member", () => {
    expect(run(rows, { groupByMode: "season-first" })).toBe(
      "**Atom01**\nSeoYeon A102Z\nHyeRin A101Z\n**Binary01**\nHyeRin B103Z",
    );
  });

  test("default with bullet bullets the member lines", () => {
    expect(run(rows, { groupByMode: "season-first", bullet: true })).toBe(
      "**Atom01**\n- SeoYeon A102Z\n- HyeRin A101Z\n**Binary01**\n- HyeRin B103Z",
    );
  });

  test("compact keeps each season on one line", () => {
    expect(run(rows, { groupByMode: "season-first", style: "compact", bullet: true })).toBe(
      "- __Atom01__ **SeoYeon** A102Z **HyeRin** A101Z\n- __Binary01__ **HyeRin** B103Z",
    );
  });

  test("member emoji shows on the member, season emoji on the season", () => {
    const idntt = [objekt("Kaede", "Spring25", "101Z", "idntt")];
    expect(run(idntt, { groupByMode: "season-first", showMemberEmoji: true })).toBe(
      "**🌸Spring25**\n🍁Kaede 101Z",
    );
  });
});
