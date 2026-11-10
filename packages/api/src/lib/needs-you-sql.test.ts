import { expect, test } from "bun:test";

import { type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { type DealRow, dealOf, needsYou } from "../schemas/chat-deal";
import { needsYouSql } from "./needs-you-sql";

const render = (q: SQL) => new PgDialect().sqlToQuery(q);

const ME = "me";
const NOW = new Date("2026-10-28T12:00:00Z");

const offer = (over: Partial<DealRow> = {}): DealRow => ({
  offerId: 261,
  offerStatus: "open",
  offerToId: ME,
  offerExpiresAt: "2026-11-01T12:00:00Z",
  trade: null,
  ...over,
});

const trade = (over: Partial<NonNullable<DealRow["trade"]>> = {}): DealRow =>
  offer({
    offerStatus: "accepted",
    trade: {
      id: 89,
      status: "in_progress",
      verified: 2,
      total: 8,
      owed: 0,
      sendable: 0,
      stuck: 0,
      toDecide: 0,
      rateable: false,
      rateUntil: null,
      cancelAsk: null,
      ...over,
    },
  });

test("Needs you rows, then needsYouSql", () => {
  const rows: [string, DealRow, boolean][] = [
    ["an open offer to me", offer(), true],
    ["an open offer to them", offer({ offerToId: "them" }), false],
    ["an expired offer", offer({ offerExpiresAt: "2026-10-27T12:00:00Z" }), false],
    ["a cancel request by them", trade({ cancelAsk: "them" }), true],
    ["a cancel request by me", trade({ cancelAsk: "you" }), false],
    ["a different copy to decide", trade({ owed: 1, toDecide: 1 }), true],
    ["a sendable leg", trade({ owed: 1, sendable: 1 }), true],
    ["a stuck leg", trade({ owed: 1, stuck: 1 }), false],
    ["their turn", trade({ owed: 0 }), false],
  ];
  for (const [name, row, expected] of rows) {
    const deal = dealOf([row], ME, NOW);
    expect({ name, needs: deal !== null && needsYou(deal.state) }).toEqual({
      name,
      needs: expected,
    });
  }
  const q = render(needsYouSql(ME));
  const pending =
    "EXISTS ( SELECT 1 FROM trade_substitute s WHERE s.trade_leg_id = l.id AND s.status = 'pending' AND NOT EXISTS ( SELECT 1 FROM trade_leg v WHERE v.tx_hash = s.tx_hash AND v.verified_objekt_id = s.objekt_id ) )";
  expect(q.sql.replace(/\s+/g, " ")).toBe(
    "EXISTS ( SELECT 1 FROM offer o LEFT JOIN trade t ON t.offer_id = o.id WHERE o.conversation_id = c.id " +
      "AND ((o.status = 'open' AND o.expires_at > now() AND o.to_user_id = $1) " +
      "OR (t.status = 'in_progress' AND EXISTS ( SELECT 1 FROM trade_cancel_request r WHERE r.trade_id = t.id AND r.status = 'pending' AND r.asked_by <> $2 )) " +
      "OR (t.status = 'in_progress' AND NOT EXISTS ( SELECT 1 FROM trade_cancel_request r WHERE r.trade_id = t.id AND r.status = 'pending' ) " +
      "AND EXISTS ( SELECT 1 FROM trade_leg l WHERE l.trade_id = t.id AND l.open AND l.verified_at IS NULL " +
      `AND ( (l.from_user_id <> $3 AND ${pending}) ` +
      `OR (l.from_user_id = $4 AND l.untransferable_at IS NULL AND NOT ${pending}) ) )))` +
      " )",
  );
  expect(q.params).toEqual([ME, ME, ME, ME]);
});
