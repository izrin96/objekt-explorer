import { describe, expect, test } from "bun:test";

import type { Event } from "@sentry/core";

import { isExpectedError, scrubBreadcrumb, scrubEvent, scrubText, scrubUrl } from "./error-scrub";

const WALLET = "0x1234567890abcdef1234567890ABCDEF12345678";
// events as an SDK or a caller may build them, looser than the published type
const event = (value: object) => value as Event;

describe("scrubText", () => {
  test("replaces emails and wallet addresses", () => {
    expect(scrubText(`mail a.b+c@example.co.kr about ${WALLET} now`)).toBe(
      "mail [email] about [address] now",
    );
  });

  test("drops the query string of an absolute URL inside text", () => {
    expect(scrubText('fetch "https://x.test/rpc/chat.send?data=%7B%22body%22%7D" failed')).toBe(
      'fetch "https://x.test/rpc/chat.send" failed',
    );
  });

  test("drops the bound values of a failed query", () => {
    expect(
      scrubText(
        'Failed query: insert into "chat_message" ("body") values ($1)\nparams: meet me at 5',
      ),
    ).toBe('Failed query: insert into "chat_message" ("body") values ($1)\nparams: [scrubbed]');
  });

  test("strips the query of a bare path too", () => {
    expect(scrubText("GET /rpc/chat/send?data=%7B%22body%22%7D failed")).toBe(
      "GET /rpc/chat/send failed",
    );
  });

  test("treats a bare 40-hex string as a wallet, any case", () => {
    expect(
      scrubText(`owner ${WALLET.slice(2)} and ${WALLET.toUpperCase().replace("0X", "0x")}`),
    ).toBe("owner [address] and [address]");
  });

  test("hides the profile named by a /@ path", () => {
    expect(scrubText("navigated to https://site.test/@kim/lists and /@0xabc")).toBe(
      "navigated to https://site.test/@[user]/lists and /@[user]",
    );
  });

  test("hides values quoted by Postgres errors", () => {
    expect(
      scrubText(
        'duplicate key value violates unique constraint "u"\nKey (email)=(kim@x.io) already exists.',
      ),
    ).toBe(
      'duplicate key value violates unique constraint "u"\nKey (email)=([scrubbed]) already exists.',
    );
    expect(scrubText('invalid input syntax for type uuid: "hello there"')).toBe(
      'invalid input syntax for type uuid: "[scrubbed]"',
    );
    expect(scrubText('invalid input value for enum list_type: "secret"')).toBe(
      'invalid input value for enum list_type: "[scrubbed]"',
    );
    expect(scrubText('value "99999999999" is out of range for type integer')).toBe(
      'value "[scrubbed]" is out of range for type integer',
    );
    expect(scrubText("Failing row contains (1, null, meet me at 5).")).toBe(
      "Failing row contains ([scrubbed]).",
    );
  });

  test("leaves a longer hex string alone", () => {
    expect(scrubText(`0x${"a".repeat(64)}`)).toBe(`0x${"a".repeat(64)}`);
  });
});

describe("scrubUrl", () => {
  test("drops query and hash, then scrubs the path", () => {
    expect(scrubUrl(`/@kim?tab=lists#x`)).toBe("/@[user]");
    expect(scrubUrl(`/api/transfers/${WALLET}?page=2`)).toBe("/api/transfers/[address]");
  });
});

describe("scrubBreadcrumb", () => {
  test("drops console breadcrumbs", () => {
    expect(scrubBreadcrumb({ category: "console", message: "input: secret" })).toBeNull();
  });

  test("keeps only method, status and query-less URLs in data", () => {
    expect(
      scrubBreadcrumb({
        category: "fetch",
        data: {
          method: "POST",
          url: "/rpc/offer.create?data=note",
          status_code: 500,
          request_body: "hello",
          response_body: "x",
        },
      }),
    ).toEqual({
      category: "fetch",
      data: { method: "POST", status_code: 500, url: "/rpc/offer.create" },
    });
  });

  test("scrubs navigation targets", () => {
    expect(
      scrubBreadcrumb({ category: "navigation", data: { from: "/@kim/trade", to: "/?q=me" } }),
    ).toEqual({ category: "navigation", data: { from: "/@[user]/trade", to: "/" } });
  });

  test("keeps a click's selector without its text attributes", () => {
    expect(
      scrubBreadcrumb({
        category: "ui.click",
        message: 'div.row > button#send.btn[aria-label="Message Kim"][title="Kim"][type="button"]',
      }),
    ).toEqual({ category: "ui.click", message: 'div.row > button#send.btn[type="button"]' });
  });
});

describe("scrubEvent", () => {
  test("keeps only the user id", () => {
    const out = scrubEvent(
      event({
        user: { id: 42, email: "a@b.co", username: "me", ip_address: "1.2.3.4" },
      }),
    );
    expect(out.user).toEqual({ id: "42" });
  });

  test("omits the user when it has no id", () => {
    expect(scrubEvent(event({ user: { email: "a@b.co" } })).user).toBeUndefined();
  });

  test("reduces the request to method, path and user agent", () => {
    const out = scrubEvent(
      event({
        request: {
          method: "POST",
          url: "https://site.test/rpc/chat.send?data=x",
          query_string: "data=x",
          cookies: { session: "s" },
          data: { body: "hi" },
          headers: { "user-agent": "UA", cookie: "s", authorization: "Bearer t" },
          env: { REMOTE_ADDR: "1.2.3.4" },
        },
      }),
    );
    expect(out.request).toEqual({
      method: "POST",
      url: "https://site.test/rpc/chat.send",
      headers: { "user-agent": "UA" },
    });
  });

  test("scrubs exception messages and drops frame locals", () => {
    const out = scrubEvent(
      event({
        exception: {
          values: [
            {
              type: "Error",
              value: `no profile for ${WALLET} (owner x@y.io)`,
              stacktrace: { frames: [{ filename: "a.js", vars: { note: "private" } }] },
            },
          ],
        },
      }),
    );
    expect(out.exception?.values?.[0]?.value).toBe("no profile for [address] (owner [email])");
    expect(out.exception?.values?.[0]?.stacktrace?.frames?.[0]).toEqual({ filename: "a.js" });
  });

  test("drops private keys at any depth of extra and contexts", () => {
    const out = scrubEvent(
      event({
        extra: { offer: { id: 1, note: "meet me", body: "hi" }, password: "p" },
        contexts: { chat: { text: "hello", conversationId: 7 } },
      }),
    );
    expect(out.extra).toEqual({ offer: { id: 1 } });
    expect(out.contexts).toEqual({ chat: { conversationId: 7 } });
  });

  test("keeps the release and scrubs the procedure tag", () => {
    const sha = "a".repeat(40);
    const out = scrubEvent(event({ release: sha, tags: { procedure: "/api/v1/@kim/lists" } }));
    expect(out.release).toBe(sha);
    expect(out.tags).toEqual({ procedure: "/api/v1/@[user]/lists" });
  });

  test("scrubs the message, transaction and breadcrumbs", () => {
    const out = scrubEvent(
      event({
        message: `failed for ${WALLET}`,
        transaction: "/@me?x=1",
        breadcrumbs: [
          { category: "console", message: "x" },
          { category: "ui.click", message: "button" },
        ],
      }),
    );
    expect(out.message).toBe("failed for [address]");
    expect(out.transaction).toBe("/@[user]");
    expect(out.breadcrumbs).toEqual([{ category: "ui.click", message: "button" }]);
  });
});

describe("isExpectedError", () => {
  const orpc = (status: number, code: string, data?: unknown) =>
    Object.assign(new Error(code), { status, code, data, defined: false });

  test("a refusal with a reason is expected, whatever its status", () => {
    expect(isExpectedError(orpc(409, "CONFLICT", { reason: "not_open" }))).toBe(true);
    expect(isExpectedError({ data: { reason: "list_have_links_want" } })).toBe(true);
  });

  test("an oRPC error under 500 is expected", () => {
    expect(isExpectedError(orpc(404, "NOT_FOUND"))).toBe(true);
    expect(isExpectedError(orpc(401, "UNAUTHORIZED"))).toBe(true);
  });

  test("a 5xx oRPC error and a plain error are not", () => {
    expect(isExpectedError(orpc(500, "INTERNAL_SERVER_ERROR"))).toBe(false);
    expect(isExpectedError(orpc(503, "SERVICE_UNAVAILABLE"))).toBe(false);
    expect(isExpectedError(new TypeError("x is undefined"))).toBe(false);
    expect(isExpectedError("boom")).toBe(false);
    expect(isExpectedError(null)).toBe(false);
  });
});
