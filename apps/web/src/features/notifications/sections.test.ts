import { describe, expect, test } from "bun:test";

import type { Notification } from "@repo/api/schemas/notification";

import { needsYou, renderable, rowAction, sectionOf } from "./sections";

const now = new Date(2026, 9, 17, 15, 0).getTime();
const at = (...parts: [number, number, number, number?]) =>
  new Date(parts[0], parts[1], parts[2], parts[3] ?? 12).toISOString();

type TradeEvent = Extract<Notification, { type: "trade" }>["payload"]["event"];
type OfferEvent = Extract<Notification, { type: "offer" }>["payload"]["event"];

const partner = { userId: "u", name: "binary.bin" };

const trade = (event: TradeEvent, createdAt = at(2026, 9, 17)): Notification => ({
  id: 1,
  readAt: null,
  createdAt,
  type: "trade",
  payload: {
    tradeId: 1042,
    offerId: 881,
    conversationId: 7,
    event,
    reason: null,
    progress: { verified: 1, total: 2 },
    partner,
  },
});

const offer = (event: OfferEvent): Notification => ({
  id: 2,
  readAt: null,
  createdAt: at(2026, 9, 17),
  type: "offer",
  payload: { offerId: 881, conversationId: 7, tradeId: null, event, reason: null, partner },
});

describe("needsYou", () => {
  test("a reminder or a copy coming due is the reader's to act on", () => {
    expect(needsYou(trade("reminder"), true, now)).toBe(true);
    expect(needsYou(trade("wrong_copy_due"), true, now)).toBe(true);
  });

  test("a verified leg is not, nor a stuck objekt, which both parties get", () => {
    expect(needsYou(trade("leg_verified"), true, now)).toBe(false);
    expect(needsYou(trade("stuck"), true, now)).toBe(false);
  });

  test("an offer received never is, since answering it writes the answerer nothing", () => {
    expect(needsYou(offer("received"), true, now)).toBe(false);
  });

  test("not with trade notes off", () => {
    expect(needsYou(trade("reminder"), false, now)).toBe(false);
  });

  test("not once the reminder is as old as a trade can stay open", () => {
    expect(needsYou(trade("reminder", at(2026, 9, 3, 15)), true, now)).toBe(false);
    expect(needsYou(trade("reminder", at(2026, 9, 3, 16)), true, now)).toBe(true);
  });
});

describe("rowAction", () => {
  test("each event that leads somewhere to act names its verb", () => {
    expect(rowAction(trade("reminder"))).toBe("send");
    expect(rowAction(trade("completed"))).toBe("feedback");
    expect(rowAction(offer("received"))).toBe("review");
    expect(rowAction(offer("countered"))).toBe("review");
  });

  test("the rest name none", () => {
    expect(rowAction(trade("leg_verified"))).toBeNull();
    const confirmed = trade("completed");
    if (confirmed.type === "trade") confirmed.payload.confirmed = true;
    expect(rowAction(confirmed)).toBeNull();
    expect(rowAction(offer("declined"))).toBeNull();
  });
});

describe("sectionOf", () => {
  test("a reminder leads", () => {
    expect(sectionOf(trade("reminder"), true, now)).toBe("needs-you");
  });

  test("today starts at local midnight", () => {
    expect(sectionOf(trade("completed", at(2026, 9, 17, 0)), true, now)).toBe("today");
    expect(
      sectionOf(trade("completed", new Date(2026, 9, 16, 23, 59).toISOString()), true, now),
    ).toBe("week");
  });

  test("this week is the 7 days before today", () => {
    expect(sectionOf(trade("completed", at(2026, 9, 10, 0)), true, now)).toBe("week");
    expect(
      sectionOf(trade("completed", new Date(2026, 9, 9, 23, 59).toISOString()), true, now),
    ).toBe("earlier");
  });
});

describe("renderable", () => {
  const alert = (latest: number): Notification => ({
    id: 3,
    readAt: null,
    createdAt: at(2026, 9, 17),
    type: "want_match",
    payload: {
      list: { id: 1, slug: "wants", name: "Wants" },
      count: Math.max(latest, 1),
      latest: Array.from({ length: latest }, () => ({
        collectionSlug: "divine01-jiwoo-312z",
        partnerName: "binary.bin",
        sourceListSlug: "haves",
      })),
    },
  });
  const sanction = (action: string): Notification => ({
    id: 4,
    readAt: null,
    createdAt: at(2026, 9, 17),
    type: "sanction",
    payload: { action: action as "warn", reason: "spam", endsAt: null },
  });

  test("every row this tab knows draws", () => {
    expect(renderable(trade("reminder"))).toBe(true);
    expect(renderable(offer("received"))).toBe(true);
    expect(renderable(alert(1))).toBe(true);
    expect(renderable(sanction("warn"))).toBe(true);
  });

  test("a type, a moderator action or an empty alert it doesn't know draws nothing", () => {
    expect(renderable({ ...trade("reminder"), type: "badge" } as never)).toBe(false);
    expect(renderable(sanction("ban"))).toBe(false);
    expect(renderable(alert(0))).toBe(false);
  });
});
