import { describe, expect, test } from "bun:test";

import { ORPCError } from "@orpc/client";

import {
  SERVER_ERROR_MESSAGE,
  errorReason,
  isFromServer,
  orpcErrorAdapter,
  retryUnlessClientError,
  retryUnlessRefused,
  serverErrorAdapter,
} from "./orpc-error";

describe("retryUnlessClientError", () => {
  test("never retries a refusal", () => {
    for (const code of ["BAD_REQUEST", "NOT_FOUND", "TOO_MANY_REQUESTS", "UNAUTHORIZED"]) {
      expect(retryUnlessClientError(0, new ORPCError(code))).toBe(false);
    }
  });

  test("retries a server failure or a network error three times", () => {
    for (const error of [
      new ORPCError("INTERNAL_SERVER_ERROR"),
      new TypeError("Failed to fetch"),
    ]) {
      expect([0, 1, 2, 3].map((count) => retryUnlessClientError(count, error))).toEqual([
        true,
        true,
        true,
        false,
      ]);
    }
  });
});

describe("retryUnlessRefused", () => {
  test("never retries a refusal", () => {
    expect(retryUnlessRefused(0, new ORPCError("TOO_MANY_REQUESTS"))).toBe(false);
  });

  test("retries a server failure or a network error twice", () => {
    for (const error of [
      new ORPCError("INTERNAL_SERVER_ERROR"),
      new TypeError("Failed to fetch"),
    ]) {
      expect([0, 1, 2].map((count) => retryUnlessRefused(count, error))).toEqual([
        true,
        true,
        false,
      ]);
    }
  });
});

describe("orpcErrorAdapter", () => {
  test("keeps code, status, message and data across a round trip", () => {
    const error = new ORPCError("CONFLICT", {
      message: "Not open",
      data: { reason: "not_open", retryAt: "2026-01-01T00:00:00.000Z" },
    });
    expect(orpcErrorAdapter.test(error)).toBe(true);
    const back = orpcErrorAdapter.fromSerializable(orpcErrorAdapter.toSerializable(error));
    expect(back).toBeInstanceOf(ORPCError);
    expect([back.code, back.status, back.message]).toEqual(["CONFLICT", 409, "Not open"]);
    expect(errorReason(back)).toEqual({ reason: "not_open", retryAt: "2026-01-01T00:00:00.000Z" });
  });

  test("keeps a 5xx without data", () => {
    const back = orpcErrorAdapter.fromSerializable(
      orpcErrorAdapter.toSerializable(new ORPCError("INTERNAL_SERVER_ERROR")),
    );
    expect(back.status).toBe(500);
    expect(back.data).toBeUndefined();
  });

  test("drops data JSON can't hold instead of failing the render", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const error = new ORPCError("BAD_REQUEST", { data: { big: 1n, cyclic } });
    const back = orpcErrorAdapter.fromSerializable(orpcErrorAdapter.toSerializable(error));
    expect(back.status).toBe(400);
    expect(back.data).toBeUndefined();
  });

  test("leaves other errors to Start's default", () => {
    expect(orpcErrorAdapter.test(new Error("x"))).toBe(false);
  });
});

describe("serverErrorAdapter", () => {
  test("sends a fixed message, never the error's own, and marks the copy", () => {
    const original = new Error('Failed query: select 1\nparams: "secret note"');
    expect(isFromServer(original)).toBe(false);
    const back = serverErrorAdapter.fromSerializable(serverErrorAdapter.toSerializable(original));
    expect(back.message).toBe(SERVER_ERROR_MESSAGE);
    expect(isFromServer(back)).toBe(true);
  });
});
