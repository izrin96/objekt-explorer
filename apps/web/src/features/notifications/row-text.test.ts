import { describe, expect, mock, test } from "bun:test";

import type { AlertMatch } from "@repo/api/schemas/notification";

import { m } from "@/paraglide/messages";

import { PARTNER_TOKEN, splitAround } from "./headline";
import {
  ACTION_LABEL,
  alertText,
  type ListNotification,
  sanctionText,
  updatesLabel,
} from "./row-text";
import type { RowAction } from "./sections";

// `m.*` returns a branded string, which `expect(...).toBe("...")` rejects.
const check = (actual: unknown) => expect(actual);

const objektName = (slug: string) => `name:${slug}`;
const until = (iso: string) => `until ${iso}`;

const match = (collectionSlug: string): AlertMatch => ({
  collectionSlug,
  partnerName: "partner",
  sourceListSlug: "list",
});

const alert = (
  type: ListNotification["type"],
  count: number,
  latest: AlertMatch[] = [match("a")],
): Pick<ListNotification, "type" | "payload"> => ({
  type,
  payload: { list: { id: 1, slug: "mine", name: "Mine" }, count, latest },
});

describe("alertText", () => {
  test("a want match of one is the single message", () => {
    check(alertText(alert("want_match", 1), "P", objektName)).toBe(
      m.notification_want_match_single({ list: "Mine", partner: "P", objekt: "name:a" }),
    );
  });

  test("a want match of several is the multiple message", () => {
    check(alertText(alert("want_match", 2), "P", objektName)).toBe(
      m.notification_want_match_multiple({
        count: 2,
        list: "Mine",
        partner: "P",
        objekt: "name:a",
      }),
    );
  });

  test("a have wanted of one is the single message", () => {
    check(alertText(alert("have_wanted", 1), "P", objektName)).toBe(
      m.notification_have_wanted_single({ list: "Mine", partner: "P", objekt: "name:a" }),
    );
  });

  test("a have wanted of several is the multiple message", () => {
    check(alertText(alert("have_wanted", 2), "P", objektName)).toBe(
      m.notification_have_wanted_multiple({
        count: 2,
        list: "Mine",
        partner: "P",
        objekt: "name:a",
      }),
    );
  });

  test("names the first of the latest matches", () => {
    const notification = alert("want_match", 3, [match("a"), match("b"), match("c")]);
    check(alertText(notification, "P", objektName)).toBe(
      m.notification_want_match_multiple({
        count: 3,
        list: "Mine",
        partner: "P",
        objekt: "name:a",
      }),
    );
  });

  test("no latest match draws nothing", () => {
    check(alertText(alert("want_match", 1, []), "P", objektName)).toBeNull();
  });

  test("a type this tab does not know draws nothing", () => {
    const notification = { ...alert("want_match", 1), type: "unknown" as never };
    check(alertText(notification, "P", objektName)).toBeNull();
  });

  test("every message holds the partner token, so the row can bold the name", () => {
    for (const type of ["want_match", "have_wanted"] as const) {
      for (const count of [1, 2]) {
        const text = alertText(alert(type, count), PARTNER_TOKEN, objektName);
        check(splitAround(String(text), PARTNER_TOKEN)).not.toBeNull();
      }
    }
  });
});

describe("sanctionText", () => {
  test("a warning and a trade block are their own messages", () => {
    check(sanctionText({ action: "warn", reason: "r", endsAt: null }, until)).toBe(
      m.notification_sanction_warn({ reason: "r" }),
    );
    check(sanctionText({ action: "trade_block", reason: "r", endsAt: null }, until)).toBe(
      m.notification_sanction_trade_block({ reason: "r" }),
    );
  });

  test("a timed chat mute says until when", () => {
    const stub = mock(until);
    check(sanctionText({ action: "chat_mute", reason: "r", endsAt: "2026-11-01" }, stub)).toBe(
      m.notification_sanction_chat_mute({ time: "until 2026-11-01", reason: "r" }),
    );
    expect(stub).toHaveBeenCalledWith("2026-11-01");
  });

  test("a chat mute with no end is the always message and asks for no time", () => {
    const stub = mock(until);
    check(sanctionText({ action: "chat_mute", reason: "r", endsAt: null }, stub)).toBe(
      m.notification_sanction_chat_mute_always({ reason: "r" }),
    );
    expect(stub).not.toHaveBeenCalled();
  });

  test("an action this tab does not know draws nothing", () => {
    check(sanctionText({ action: "ban" as never, reason: "r", endsAt: null }, until)).toBeNull();
  });
});

describe("updatesLabel", () => {
  test("one is its own message", () => {
    check(updatesLabel(1)).toBe(m.notification_updates_one());
  });

  test("more count the updates", () => {
    check(updatesLabel(2)).toBe(m.notification_updates({ count: 2 }));
    check(updatesLabel(999)).toBe(m.notification_updates({ count: 999 }));
  });
});

describe("ACTION_LABEL", () => {
  test("each action reads its own message", () => {
    const expected: Record<RowAction, string> = {
      send: m.notification_action_send(),
      review: m.notification_action_review(),
      feedback: m.notification_action_feedback(),
      matches: m.notification_action_matches(),
    };
    for (const action of Object.keys(expected) as RowAction[]) {
      check(ACTION_LABEL[action]()).toBe(expected[action]);
    }
  });
});
