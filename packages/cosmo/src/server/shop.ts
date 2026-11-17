import { FetchError, ofetch } from "ofetch";

import { errorKindOf, type CosmoErrorKind } from "../session-parse";
import { COSMO_ENDPOINT } from "../types/common";
import { cosmoProxyOptions } from "./http";

export const COSMO_SHOP_ENDPOINT = "https://shop.cosmo.fans";

// One fixed message per kind: a thrown error reaches logs and Sentry, and must carry no URL,
// ticket, code, cookie or response body.
const MESSAGES: Record<CosmoErrorKind, string> = {
  refused: "Cosmo refused the request",
  dead: "Cosmo session is no longer valid",
  unavailable: "Cosmo is unavailable",
  busy: "Cosmo is busy",
  unexpected: "Cosmo sent an unexpected response",
};

export class CosmoSessionError extends Error {
  readonly kind: CosmoErrorKind;
  /** null when no response came */
  readonly status: number | null;

  // No `cause` on purpose: Sentry serializes causes, and ofetch's FetchError message holds the URL
  constructor(kind: CosmoErrorKind, status: number | null = null) {
    super(MESSAGES[kind]);
    this.name = "CosmoSessionError";
    this.kind = kind;
    this.status = status;
  }
}

// Cosmo's shop answers a plain browser, so the calls look like the shop page's own
const shopHeaders = {
  origin: COSMO_SHOP_ENDPOINT,
  accept: "application/json",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};

/**
 * HTTP client for shop.cosmo.fans, where the QR sign-in lives. `retry: false`: a retried ticket
 * POST burns a reCAPTCHA token and a retried certify sends the one-time code twice.
 */
export const cosmoShop = ofetch.create({
  baseURL: COSMO_SHOP_ENDPOINT,
  ...cosmoProxyOptions,
  retry: false,
  timeout: 1000 * 10,
  headers: shopHeaders,
});

/** The same browser-like headers on api.cosmo.fans, where the session cookie reads data. */
export const cosmoSessionApi = ofetch.create({
  baseURL: COSMO_ENDPOINT,
  ...cosmoProxyOptions,
  retry: false,
  timeout: 1000 * 10,
  headers: shopHeaders,
});

/**
 * Runs one Cosmo call and turns anything it throws into a `CosmoSessionError`, so no
 * `FetchError` (whose message carries the URL and query) escapes.
 */
export async function guard<T>(withCookie: boolean, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (err instanceof CosmoSessionError) throw err;
    if (err instanceof FetchError) {
      const status = err.response?.status ?? null;
      throw new CosmoSessionError(errorKindOf(status, err.data, withCookie), status);
    }
    // a timeout or a refused connection
    throw new CosmoSessionError("unavailable");
  }
}

/** Parses a response body; a mismatch is `unexpected`, never the Zod error with the value in it. */
export function parseBody<T>(
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false } },
  data: unknown,
): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new CosmoSessionError("unexpected");
  return parsed.data;
}

export function sessionCookieHeader(cookie: string) {
  return { cookie: `user-session=${cookie}` };
}
