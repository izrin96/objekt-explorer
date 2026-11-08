import { describe, expect, test } from "bun:test";

import {
  type DropRegion,
  fitDropGrid,
  fitMemberRun,
  insideDrop,
  mergeGridRanges,
  rosterComplete,
} from "./drop-grid";

const runs = (...pairs: [number, number][]) =>
  pairs.flatMap(([lo, hi]) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i));

// Cream02 356A, trimmed to each member's lowest and highest token
const cream02356a: DropRegion = {
  start: 29549511,
  memberTokens: [
    [29549513, 29549905],
    [29549925, 29550118],
    [29550325, 29550574],
    [29550754, 29550844],
    [29551194, 29551197], // yooyeon
    [29551580, 29551585],
    [29551942, 29552219],
    [29552491, 29552565],
    [29552940, 29553079],
    [29553131, 29553408],
    [29553720, 29553906],
    [29554144, 29554198],
    [29554588, 29554654],
    [29554761, 29555106],
    [29555192, 29555491],
    [29555766, 29555776],
    [29556108, 29556309],
    [29556384, 29556594],
    [29556763, 29557101],
    [29557219, 29557429],
    [29557603, 29557732],
    [29558111, 29558111],
    [29558370, 29558506],
    [29558798, 29559108],
  ],
  foreign: [29553111, 29556712, 29557113, 29559114, 29559115, 29559116],
  readUntil: 29560000,
};

// Binary02 304A, trimmed the same way: 180-token slots and many separators
const binary02304a: DropRegion = {
  start: 17718642,
  memberTokens: [
    [17718642, 17718821],
    [17718822, 17719001],
    [17719014, 17719193],
    [17719223, 17719398],
    [17719401, 17719584],
    [17719589, 17719767],
    [17719770, 17719949],
    [17719952, 17720131],
    [17720158, 17720336],
    [17720340, 17720518],
    [17720526, 17720705],
    [17720706, 17720885],
    [17720889, 17721067],
    [17721070, 17721249],
    [17721255, 17721433],
    [17721436, 17721640],
    [17721641, 17721819],
    [17721823, 17722002],
    [17722006, 17722186],
    [17722190, 17722368],
    [17722380, 17722554],
    [17722588, 17722765],
    [17722769, 17722946],
    [17722950, 17723129],
  ],
  foreign: runs(
    [17719002, 17719013],
    [17719194, 17719219],
    [17719400, 17719400],
    [17719501, 17719504],
    [17719585, 17719587],
    [17719768, 17719769],
    [17719950, 17719951],
    [17720132, 17720157],
    [17720338, 17720339],
    [17720520, 17720525],
    [17720886, 17720886],
    [17720987, 17720987],
    [17721068, 17721069],
    [17721250, 17721253],
    [17721354, 17721354],
    [17721435, 17721435],
    [17721536, 17721560],
    [17721821, 17721822],
    [17721923, 17721923],
    [17722004, 17722005],
    [17722106, 17722106],
    [17722187, 17722189],
    [17722290, 17722290],
    [17722371, 17722379],
    [17722560, 17722585],
    [17722686, 17722686],
    [17722767, 17722768],
    [17722949, 17722949],
    [17723130, 17723139],
  ),
  readUntil: 17724000,
};

const serialOf = (ranges: { start: number; end: number }[], token: number) => {
  let before = 0;
  for (const r of ranges) {
    if (token >= r.start && token <= r.end) return before + token - r.start + 1;
    before += r.end - r.start + 1;
  }
  return null;
};

describe("fitDropGrid", () => {
  test("Cream02 356A fits 400-token slots and gives YooYeon's reported #87", () => {
    const { slots, grid } = fitDropGrid(cream02356a);
    expect(slots).toEqual([400]);
    expect(grid!.end).toBe(29559113);
    expect(grid!.separators).toBe(3);
    expect(grid!.ranges[4]).toEqual([{ start: 29551111, end: 29551510 }]);
    expect(serialOf(grid!.ranges[4]!, 29551197)).toBe(87);
  });

  test("slot sizes need not be whole hundreds", () => {
    const { slots, grid } = fitDropGrid(binary02304a);
    expect(slots).toEqual([180]);
    expect(grid!.ranges[0]).toEqual([{ start: 17718642, end: 17718821 }]);
    expect(grid!.ranges[23]).toEqual([{ start: 17722950, end: 17723129 }]);
  });

  test("a separator inside a slot splits it and takes no serial", () => {
    const { grid } = fitDropGrid(binary02304a);
    // HyeRin's slot holds the foreign run 17719501-17719504
    const hyerin = grid!.ranges[4]!;
    expect(hyerin).toEqual([
      { start: 17719401, end: 17719500 },
      { start: 17719505, end: 17719584 },
    ]);
    expect(hyerin.reduce((n, r) => n + r.end - r.start + 1, 0)).toBe(180);
    expect(serialOf(hyerin, 17719505)).toBe(101);
  });

  test("more than one fitting slot size is no grid", () => {
    // two members with one token each; slots 100 and 101 both end right before a foreign token
    const region: DropRegion = {
      start: 1000,
      memberTokens: [[1000], [1150]],
      foreign: [1200, 1203],
      readUntil: 2000,
    };
    const { slots, grid } = fitDropGrid(region);
    expect(slots).toEqual([100, 101]);
    expect(grid).toBeNull();
  });

  test("a drop whose next token is unminted does not fit", () => {
    const region = { ...cream02356a, foreign: [29553111, 29556712, 29557113] };
    expect(fitDropGrid(region).grid).toBeNull();
  });

  test("a drop ending past what was read cannot be judged", () => {
    expect(fitDropGrid({ ...cream02356a, readUntil: 29559113 }).grid).toBeNull();
  });

  test("a member token in a neighbour's slot rules the size out", () => {
    const memberTokens = cream02356a.memberTokens.map((t) => [...t]);
    // a SooMin token inside YooYeon's slot
    memberTokens[5] = [29551300, ...memberTokens[5]!];
    expect(fitDropGrid({ ...cream02356a, memberTokens }).slots).not.toContain(400);
  });

  test("every member needs a token in its slot", () => {
    // member 1's only token sits in member 2's slot for slot 100
    const region: DropRegion = {
      start: 1000,
      memberTokens: [[1000, 1099], [1250], [1260]],
      foreign: [1300],
      readUntil: 2000,
    };
    expect(fitDropGrid(region).slots).not.toContain(100);
  });

  test("a one-member drop is no grid", () => {
    expect(fitDropGrid({ ...cream02356a, memberTokens: [[29549513]] }).grid).toBeNull();
  });
});

describe("mergeGridRanges", () => {
  const drop = { start: 1000, end: 1999 };
  const slot = [{ start: 1400, end: 1799 }];

  test("replaces the batches inside the drop and keeps the rest", () => {
    const batches = [
      { start: 500, end: 599 },
      { start: 1300, end: 1650 },
      { start: 3000, end: 3099 },
    ];
    expect(mergeGridRanges(batches, slot, drop, [550, 1500, 3050])).toEqual([
      { start: 500, end: 599 },
      { start: 1400, end: 1799 },
      { start: 3000, end: 3099 },
    ]);
  });

  test("a batch crossing the drop's end keeps its part from the first token past it", () => {
    const batches = [{ start: 1600, end: 2300 }];
    expect(mergeGridRanges(batches, slot, drop, [1700, 2100, 2300])).toEqual([
      { start: 1400, end: 1799 },
      { start: 2100, end: 2300 },
    ]);
  });

  test("a restock after the drop continues after the slot", () => {
    const merged = mergeGridRanges(
      [
        { start: 1400, end: 1500 },
        { start: 3000, end: 3099 },
      ],
      slot,
      drop,
      [1450, 3000],
    );
    expect(serialOf(merged, 3000)).toBe(401);
  });
});

describe("insideDrop", () => {
  const drop = { start: 1000, end: 1999 };

  test("a batch within the drop span is inside", () => {
    expect(insideDrop({ start: 1000, end: 1999 }, drop)).toBe(true);
    expect(insideDrop({ start: 1400, end: 1799 }, drop)).toBe(true);
  });

  test("a batch reaching past either edge is outside", () => {
    expect(insideDrop({ start: 999, end: 1500 }, drop)).toBe(false);
    expect(insideDrop({ start: 1900, end: 2100 }, drop)).toBe(false);
    expect(insideDrop({ start: 3000, end: 3099 }, drop)).toBe(false);
  });
});

// Cream02 KaeDe 334A-337A, trimmed to each collection's lowest and highest token
const kaede334a: DropRegion = {
  start: 27532650,
  memberTokens: [
    [27532674, 27533115],
    [27533174, 27533612],
    [27533663, 27534149],
    [27534150, 27534646],
  ],
  foreign: [27534650],
  readUntil: 27540000,
};

// Binary02 DaHyun 339A-340A: three unminted tokens sit after the second slot
const dahyun339a: DropRegion = {
  start: 21331821,
  memberTokens: [
    [21331822, 21333170],
    [21333173, 21334518],
  ],
  foreign: [21334524],
  readUntil: 21340000,
};

describe("fitMemberRun", () => {
  test("Cream02 KaeDe fits 500-token slots", () => {
    const { slots, grid } = fitMemberRun(kaede334a);
    expect(slots).toEqual([500]);
    expect(grid?.ranges[2]).toEqual([{ start: 27533650, end: 27534149 }]);
  });

  test("unseen tokens after the last slot are left out, not spread over the slots", () => {
    const { slots, grid } = fitMemberRun(dahyun339a);
    expect(slots).toEqual([1350]);
    expect(grid?.end).toBe(21334520);
    expect(grid?.ranges[1]).toEqual([{ start: 21333171, end: 21334520 }]);
  });

  test("more than 9 tokens before the next foreign token rule a size out", () => {
    expect(fitMemberRun({ ...dahyun339a, foreign: [21334533] }).slots).toEqual([]);
  });

  test("a run token inside the slack rules a size out", () => {
    const memberTokens = [dahyun339a.memberTokens[0]!, [21333173, 21334518, 21334522]];
    expect(fitMemberRun({ ...dahyun339a, memberTokens }).slots).toEqual([]);
  });

  test("a token in a neighbour's slot rules a size out", () => {
    const memberTokens = kaede334a.memberTokens.with(0, [27532674, 27533115, 27533160]);
    expect(fitMemberRun({ ...kaede334a, memberTokens }).slots).not.toContain(500);
  });

  test("every collection needs a token in its slot", () => {
    const memberTokens = kaede334a.memberTokens.with(1, []);
    expect(fitMemberRun({ ...kaede334a, memberTokens }).grid).toBeNull();
  });

  test("more than one fitting size is no grid", () => {
    const region: DropRegion = {
      start: 1000,
      memberTokens: [[1000], [1300]],
      foreign: [1500, 1521],
      readUntil: 2000,
    };
    const { slots, grid } = fitMemberRun(region);
    expect(slots).toEqual([250, 260]);
    expect(grid).toBeNull();
  });

  test("a separator inside a slot splits it", () => {
    const region: DropRegion = {
      start: 1000,
      memberTokens: [
        [1000, 1100],
        [1101, 1200],
      ],
      foreign: [1050, 1201],
      readUntil: 2000,
    };
    expect(fitMemberRun(region).grid?.ranges[0]).toEqual([
      { start: 1000, end: 1049 },
      { start: 1051, end: 1100 },
    ]);
  });
});

describe("rosterComplete", () => {
  test("a drop missing a member that hasn't minted is not complete", () => {
    // A and C minted, B (between them) not yet: the two fit a wrong grid
    expect(rosterComplete(2, [3, 3])).toBe(false);
    expect(rosterComplete(23, [24, 12, 24])).toBe(false);
  });

  test("a drop with every member minted is complete", () => {
    expect(rosterComplete(24, [24, 12, 24])).toBe(true);
  });

  test("a subunit drop never is", () => {
    expect(rosterComplete(12, [24, 24])).toBe(false);
  });

  test("the first A drop of a season, with nothing to compare, never is", () => {
    expect(rosterComplete(24, [])).toBe(false);
  });
});
