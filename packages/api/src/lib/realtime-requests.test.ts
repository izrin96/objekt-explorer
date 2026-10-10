import { describe, expect, test } from "bun:test";

import type { ActivityItem } from "../schemas/activity";
import type { RealtimeEvent } from "../schemas/realtime";
import {
  activityRequest,
  batchRequest,
  broadcastRequest,
  disconnectRequest,
  firstApiError,
  publishRequest,
} from "./realtime-requests";

const changed: RealtimeEvent = { type: "notifications_changed" };

describe("requests", () => {
  test("a user's events go to their own channel", () => {
    expect(publishRequest("u1", changed)).toEqual({
      path: "/api/publish",
      body: { channel: "user:#u1", data: changed },
    });
  });

  test("a broadcast names each user's channel once", () => {
    expect(broadcastRequest(["u1", "u2", "u1"], changed).body).toEqual({
      channels: ["user:#u1", "user:#u2"],
      data: changed,
    });
  });

  test("a batch keeps each user's own event, in order", () => {
    const other: RealtimeEvent = { type: "chat_changed", conversationId: 3 };
    expect(
      batchRequest([
        { userId: "u1", event: changed },
        { userId: "u2", event: other },
      ]),
    ).toEqual({
      path: "/api/batch",
      body: {
        commands: [
          { publish: { channel: "user:#u1", data: changed } },
          { publish: { channel: "user:#u2", data: other } },
        ],
      },
    });
  });

  test("activity rows are one publication each, in the order given", () => {
    const rows = [{ transfer: { id: "a" } }, { transfer: { id: "b" } }] as ActivityItem[];
    const { body } = activityRequest(rows);
    expect(body).toEqual({
      commands: [
        { publish: { channel: "activity:feed", data: rows[0] } },
        { publish: { channel: "activity:feed", data: rows[1] } },
      ],
    });
  });

  test("a ban disconnects with the code the client does not reconnect after", () => {
    expect(disconnectRequest("u9")).toEqual({
      path: "/api/disconnect",
      body: { user: "u9", disconnect: { code: 4501, reason: "session_revoked" } },
    });
  });
});

describe("firstApiError", () => {
  test("reads an error in the body or in any reply of a batch", () => {
    expect(firstApiError({ result: {} })).toBeNull();
    expect(firstApiError({ replies: [{ publish: {} }, {}] })).toBeNull();
    expect(firstApiError({ error: { code: 102, message: "unknown channel" } })).toEqual({
      code: 102,
      message: "unknown channel",
    });
    expect(
      firstApiError({ replies: [{}, { error: { code: 107, message: "bad request" } }] }),
    ).toEqual({
      code: 107,
      message: "bad request",
    });
    expect(firstApiError(null)).toBeNull();
  });
});
