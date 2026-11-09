import { describe, expect, test } from "bun:test";

import { cancelAnswerText, label } from "./timeline-text";
import type { TimelineRow } from "./trade-clock";
import { copy, leg, trade } from "./trade-fixture";

// `m.*` returns a branded string, which `expect(...).toBe("...")` rejects.
const check = (actual: unknown) => expect(actual);
const AT = "2026-10-20T12:00:00.000Z";
const t = trade();
const text = (row: TimelineRow) => label(row, t, "Mina", {});

describe("label", () => {
  test("proposed", () => {
    check(text({ kind: "proposed", at: AT, when: "past" })).toBe("Proposed");
  });

  test("sent names who sent", () => {
    const mine = leg({ fromYou: true, objektId: null, serial: null });
    const theirs = leg({ fromYou: false, objektId: null, serial: null });
    check(text({ kind: "sent", at: AT, when: "past", leg: mine, txHash: null })).toMatch(
      /^You sent /,
    );
    check(text({ kind: "sent", at: AT, when: "past", leg: theirs, txHash: null })).toMatch(
      /^Mina sent /,
    );
  });

  test("copyDue shows the copy's serial", () => {
    const row: TimelineRow = {
      kind: "copyDue",
      at: AT,
      when: "future",
      leg: leg(),
      copy: copy({ serial: 1188 }),
    };
    check(text(row)).toContain("#1188");
  });

  test("ends words each outcome", () => {
    check(text({ kind: "ends", at: AT, when: "future", outcome: "failed" })).toBe(
      "Ends as failed if still unfinished",
    );
  });

  test("end agreed", () => {
    check(text({ kind: "end", at: AT, when: "past", outcome: "agreed" })).toBe(
      "Cancelled by agreement",
    );
  });
});

describe("cancelAnswerText", () => {
  test("pending waits for an answer", () => {
    check(cancelAnswerText("pending")).toBe("Waiting for an answer");
  });
});
