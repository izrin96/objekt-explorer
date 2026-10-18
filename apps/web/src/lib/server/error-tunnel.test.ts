import { describe, expect, test } from "bun:test";

import { envelopeTarget, keepEventItems, parseDsn, readCapped } from "./error-tunnel";

const DSN = "http://abc123@glitchtip:8000/2";
const bytes = (text: string) => new TextEncoder().encode(text);
const envelope = (header: unknown) =>
  bytes(`${JSON.stringify(header)}\n{"type":"event"}\n{"message":"x"}`);

describe("parseDsn", () => {
  test("reads origin, key and project", () => {
    expect(parseDsn(DSN)).toEqual({
      origin: "http://glitchtip:8000",
      publicKey: "abc123",
      projectId: "2",
    });
  });

  test("refuses a DSN without a key or a numeric project", () => {
    expect(parseDsn("http://glitchtip:8000/2")).toBeNull();
    expect(parseDsn("http://abc@glitchtip:8000/x")).toBeNull();
    expect(parseDsn("not a url")).toBeNull();
    expect(parseDsn(undefined)).toBeNull();
  });
});

describe("envelopeTarget", () => {
  test("forwards an envelope for the configured DSN to its envelope endpoint", () => {
    expect(envelopeTarget(envelope({ dsn: DSN, event_id: "e" }), DSN)).toBe(
      "http://glitchtip:8000/api/2/envelope/?sentry_key=abc123",
    );
  });

  test("refuses another host, project or key", () => {
    expect(envelopeTarget(envelope({ dsn: "http://abc123@evil.test/2" }), DSN)).toBeNull();
    expect(envelopeTarget(envelope({ dsn: "http://abc123@glitchtip:8000/3" }), DSN)).toBeNull();
    expect(envelopeTarget(envelope({ dsn: "http://other@glitchtip:8000/2" }), DSN)).toBeNull();
    expect(envelopeTarget(envelope({ dsn: "https://abc123@glitchtip:8000/2" }), DSN)).toBeNull();
  });

  test("refuses an envelope without a DSN or a JSON header", () => {
    expect(envelopeTarget(envelope({ event_id: "e" }), DSN)).toBeNull();
    expect(envelopeTarget(bytes("hello\n{}"), DSN)).toBeNull();
    expect(envelopeTarget(bytes(""), DSN)).toBeNull();
  });

  test("refuses everything when the configured DSN is unusable", () => {
    expect(envelopeTarget(envelope({ dsn: DSN }), "http://glitchtip:8000/2")).toBeNull();
  });
});

describe("keepEventItems", () => {
  const text = (value: Uint8Array | null) => value && new TextDecoder().decode(value);
  const head = JSON.stringify({ dsn: DSN });

  test("keeps event items and drops the rest", () => {
    const attachment = "line one\nline two";
    const body = [
      head,
      JSON.stringify({ type: "attachment", length: attachment.length }),
      attachment,
      '{"type":"event"}',
      '{"message":"x"}',
      '{"type":"session"}',
      '{"sid":"s"}',
      '{"type":"replay_recording","length":3}',
      "abc",
    ].join("\n");
    expect(text(keepEventItems(bytes(body)))).toBe(`${head}\n{"type":"event"}\n{"message":"x"}\n`);
  });

  test("measures a length payload in bytes", () => {
    const payload = '{"message":"한국"}';
    const body = `${head}\n{"type":"event","length":${bytes(payload).length}}\n${payload}\n`;
    expect(text(keepEventItems(bytes(body)))).toBe(
      `${head}\n{"type":"event","length":${bytes(payload).length}}\n${payload}\n`,
    );
  });

  test("is null without an event item", () => {
    expect(keepEventItems(bytes(`${head}\n{"type":"client_report"}\n{}`))).toBeNull();
    expect(keepEventItems(bytes(head))).toBeNull();
  });

  test("is null for a malformed item header or an overlong length", () => {
    expect(keepEventItems(bytes(`${head}\nnot json\n{}`))).toBeNull();
    expect(keepEventItems(bytes(`${head}\n{"type":"event","length":99}\n{}`))).toBeNull();
  });
});

describe("readCapped", () => {
  test("returns the whole body under the cap", async () => {
    const body = await readCapped(new Response("hello").body, 10, 1000);
    expect(body instanceof Uint8Array && new TextDecoder().decode(body)).toBe("hello");
  });

  test("stops past the cap", async () => {
    expect(await readCapped(new Response("x".repeat(11)).body, 10, 1000)).toBe("too_large");
  });

  test("stops at the deadline", async () => {
    const stalled = new ReadableStream<Uint8Array>({ start: () => undefined });
    expect(await readCapped(stalled, 10, 20)).toBe("timeout");
  });
});
