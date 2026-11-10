import { describe, expect, test } from "bun:test";

import { Addresses } from "./index";
import {
  pairSpins,
  pairSpinsInWindows,
  SPIN_REWARD_WINDOW_MS,
  type SpinEvent,
  spinOutcome,
  spinNotes,
  spinRole,
  spinWindows,
} from "./spin-pairing";

const T0 = Date.parse("2026-11-07T12:00:00Z");
const sec = (s: number) => T0 + s * 1000;

function ev(id: string, at: number, artist = "tripleS", address = "0xabc"): SpinEvent {
  return { id, address, at, artist };
}

describe("pairSpins", () => {
  test("a single spin takes the next mint of its artist", () => {
    expect(pairSpins([ev("s", sec(0))], [ev("m", sec(15))])).toEqual(new Map([["s", "m"]]));
  });

  test("a spin sent before the last reward landed costs at most a swap of the two", () => {
    const pairs = pairSpins(
      [ev("a", sec(0)), ev("b", sec(5))],
      [ev("ra", sec(20)), ev("rb", sec(31))],
    );
    expect(pairs).toEqual(
      new Map([
        ["b", "ra"],
        ["a", "rb"],
      ]),
    );
  });

  test("a broke spin does not take the next spin's reward", () => {
    const pairs = pairSpins([ev("broke", sec(0)), ev("next", sec(40))], [ev("reward", sec(56))]);
    expect(pairs).toEqual(new Map([["next", "reward"]]));
  });

  test("a run of quick spins with breaks pairs each reward with the spin just before it", () => {
    // prod, 2026-11-10 10:40-10:46: oldest-first left DaHyun 105Z broke and gave
    // its Nien 102Z to a broke spin three minutes earlier
    const at = (hms: string) => Date.parse(`2026-11-10T${hms}Z`);
    const pairs = pairSpins(
      [
        ev("jiyeon-1", at("10:40:56")),
        ev("jiyeon-2", at("10:41:30")),
        ev("sullin", at("10:42:44")),
        ev("dahyun", at("10:43:49")),
        ev("seoah", at("10:44:21")),
        ev("nien", at("10:45:35")),
      ],
      [
        ev("m-sullin", at("10:41:09")),
        ev("m-dahyun", at("10:41:57")),
        ev("m-seoah", at("10:43:06")),
        ev("m-nien", at("10:44:05")),
      ],
    );
    expect(pairs).toEqual(
      new Map([
        ["jiyeon-1", "m-sullin"],
        ["jiyeon-2", "m-dahyun"],
        ["sullin", "m-seoah"],
        ["dahyun", "m-nien"],
      ]),
    );
  });

  test("a chained spin of a reward pairs with the mint after it", () => {
    // spin A, reward R, spin R, reward R2
    const pairs = pairSpins(
      [ev("spinA", sec(0)), ev("spinR", sec(60))],
      [ev("R", sec(16)), ev("R2", sec(75))],
    );
    expect(pairs).toEqual(
      new Map([
        ["spinA", "R"],
        ["spinR", "R2"],
      ]),
    );
  });

  test("a mint of another artist is not a reward", () => {
    expect(pairSpins([ev("s", sec(0), "tripleS")], [ev("m", sec(10), "ARTMS")]).size).toBe(0);
  });

  test("artist compares without case", () => {
    expect(pairSpins([ev("s", sec(0), "tripleS")], [ev("m", sec(10), "triples")]).get("s")).toBe(
      "m",
    );
  });

  test("a mint past the window is not a reward", () => {
    const late = T0 + SPIN_REWARD_WINDOW_MS + 1;
    expect(pairSpins([ev("s", T0)], [ev("m", late)]).size).toBe(0);
    expect(pairSpins([ev("s", T0)], [ev("m", T0 + SPIN_REWARD_WINDOW_MS)]).get("s")).toBe("m");
  });

  test("a mint before the spin is not its reward", () => {
    expect(pairSpins([ev("s", sec(10))], [ev("m", sec(5))]).size).toBe(0);
  });

  test("an expired spin does not hold back a newer one", () => {
    const pairs = pairSpins(
      [ev("old", T0), ev("new", T0 + SPIN_REWARD_WINDOW_MS + 5_000)],
      [ev("m", T0 + SPIN_REWARD_WINDOW_MS + 10_000)],
    );
    expect(pairs).toEqual(new Map([["new", "m"]]));
  });

  test("a mint is the reward of one spin only, and spinners do not share", () => {
    const pairs = pairSpins(
      [ev("a", sec(0), "tripleS", "0xa"), ev("b", sec(0), "tripleS", "0xb")],
      [ev("m", sec(10), "tripleS", "0xa")],
    );
    expect(pairs).toEqual(new Map([["a", "m"]]));
  });

  test("an in-flight spin of another artist is skipped, not blocking", () => {
    const pairs = pairSpins(
      [ev("artms", sec(0), "ARTMS"), ev("triples", sec(2), "tripleS")],
      [ev("m", sec(15), "tripleS")],
    );
    expect(pairs).toEqual(new Map([["triples", "m"]]));
  });

  test("address compares without case", () => {
    expect(
      pairSpins([ev("s", sec(0), "tripleS", "0xABC")], [ev("m", sec(5), "tripleS", "0xabc")]).get(
        "s",
      ),
    ).toBe("m");
  });
});

describe("spinOutcome", () => {
  test("a paired spin has a reward", () => {
    expect(spinOutcome(T0, true, T0)).toBe("reward");
  });

  test("an unpaired spin is pending within the window of the indexer's clock", () => {
    expect(spinOutcome(T0, false, T0 + 20_000)).toBe("pending");
    expect(spinOutcome(T0, false, T0 + SPIN_REWARD_WINDOW_MS)).toBe("pending");
  });

  test("an unpaired spin older than the window broke", () => {
    expect(spinOutcome(T0, false, T0 + 15 * 60 * 1000)).toBe("broke");
  });
});

describe("spinRole", () => {
  test("a send to Spin is a spin, a mint to anyone else may be a reward", () => {
    expect(spinRole("0xabc", Addresses.SPIN)).toBe("spin");
    expect(spinRole(Addresses.NULL, "0xabc")).toBe("mint");
    expect(spinRole("0xabc", "0xdef")).toBeNull();
  });

  test("a mint straight to Spin is neither", () => {
    expect(spinRole(Addresses.NULL, Addresses.SPIN)).toBeNull();
  });
});

describe("spinWindows", () => {
  test("a row reads two windows back and one ahead, and nearby rows share a span", () => {
    const windows = spinWindows([
      { from: "0xABC", to: Addresses.SPIN, at: sec(0) },
      { from: Addresses.NULL, to: "0xabc", at: sec(30) },
      { from: "0xabc", to: "0xdef", at: sec(60) },
    ]);
    expect(windows).toEqual([
      {
        address: "0xabc",
        from: sec(0) - 2 * SPIN_REWARD_WINDOW_MS,
        to: sec(30) + SPIN_REWARD_WINDOW_MS,
      },
    ]);
  });

  test("rows far apart read separate spans, not the months between them", () => {
    const day = 24 * 60 * 60 * 1000;
    const windows = spinWindows([
      { from: "0xabc", to: Addresses.SPIN, at: T0 },
      { from: "0xabc", to: Addresses.SPIN, at: T0 + 90 * day },
    ]);
    expect(windows).toHaveLength(2);
    expect(windows.every((w) => w.to - w.from === 3 * SPIN_REWARD_WINDOW_MS)).toBe(true);
  });

  test("spans that only touch merge, so no transfer is read twice", () => {
    const windows = spinWindows([
      { from: "0xabc", to: Addresses.SPIN, at: T0 },
      { from: "0xabc", to: Addresses.SPIN, at: T0 + 3 * SPIN_REWARD_WINDOW_MS },
    ]);
    expect(windows).toHaveLength(1);
  });

  test("the page-edge chain pairs the same from either page", () => {
    // spins S0 0:00, S1 2:00; mints Ma 6:00, M 11:30. A page holding only M reads S0 and S1 too.
    const min = (m: number) => T0 + m * 60_000;
    const [window] = spinWindows([{ from: Addresses.NULL, to: "0xabc", at: min(11.5) }]);
    expect(window!.from).toBeLessThanOrEqual(min(0));
    const pairs = pairSpins(
      [ev("S0", min(0)), ev("S1", min(2))],
      [ev("Ma", min(6)), ev("M", min(11.5))],
    );
    expect(pairs).toEqual(new Map([["S1", "Ma"]]));
  });

  test("a page with no spin or mint reads nothing", () => {
    expect(spinWindows([{ from: "0xa", to: "0xb", at: T0 }])).toEqual([]);
  });
});

describe("spinNotes", () => {
  const spin = { id: "s", from: "0xabc", to: Addresses.SPIN, at: T0 };
  const mint = { id: "m", from: Addresses.NULL, to: "0xabc", at: sec(15) };
  const plain = { id: "t", from: "0xabc", to: "0xdef", at: sec(20) };

  test("a paired spin names its reward and the reward names its spin", () => {
    const notes = spinNotes([spin, mint, plain], new Map([["s", "m"]]), sec(30));
    expect(notes.get("s")).toEqual({ kind: "spin", outcome: "reward", rewardId: "m" });
    expect(notes.get("m")).toEqual({ kind: "reward", spinId: "s" });
    expect(notes.has("t")).toBe(false);
  });

  test("an unpaired spin is pending or broke by the clock, an unpaired mint carries nothing", () => {
    expect(spinNotes([spin, mint], new Map(), sec(30)).get("s")).toEqual({
      kind: "spin",
      outcome: "pending",
    });
    expect(spinNotes([spin], new Map(), T0 + 11 * 60 * 1000).get("s")).toEqual({
      kind: "spin",
      outcome: "broke",
    });
    expect(spinNotes([spin, mint], new Map(), sec(30)).has("m")).toBe(false);
  });
});

describe("pairSpinsInWindows", () => {
  const min = (m: number) => T0 + m * 60_000;
  const windows = [
    { address: "0xabc", from: min(-20), to: min(10) },
    { address: "0xabc", from: min(15), to: min(45) },
  ];

  test("a spin does not reach across the gap to the next window's mint", () => {
    // its real reward at 10.5 min fell in the gap and was never read
    const pairs = pairSpinsInWindows(windows, [ev("s", min(9.5))], [ev("m", min(16))]);
    expect(pairs.size).toBe(0);
  });

  test("each window pairs its own spins and mints", () => {
    const pairs = pairSpinsInWindows(
      windows,
      [ev("a", min(0)), ev("b", min(20))],
      [ev("ra", min(1)), ev("rb", min(21))],
    );
    expect(pairs).toEqual(
      new Map([
        ["a", "ra"],
        ["b", "rb"],
      ]),
    );
  });
});
