import * as z from "zod";

/** Days before the end of a session at which Renew shows and the expiry notice goes out. */
export const RENEW_NOTICE_DAYS = 14;

/** The notice's `group_key`: it names one connect's expiry, so an unread notice of an earlier connect never blocks the next. */
export const expiryGroupKey = (sessionId: number, expiresAt: string) =>
  `cosmo_session_expiry:${sessionId}:${Math.floor(Date.parse(expiresAt) / 1000)}`;

/** `data.reason` on a refused Cosmo sign-in or session call. */
export const COSMO_SESSION_REFUSALS = [
  "cosmo_session_unavailable",
  "cosmo_session_busy",
  "cosmo_session_captcha",
  "cosmo_session_expired",
  "cosmo_session_wrong_code",
  "cosmo_session_cosmo_error",
  "cosmo_session_limit",
  "cosmo_session_not_allowed",
  "cosmo_session_dead",
  "cosmo_session_not_found",
] as const;
export type CosmoSessionRefusal = (typeof COSMO_SESSION_REFUSALS)[number];

// The 2 digits the Cosmo app shows, sent as a number: "07" arrives as 7
export const certifyInputSchema = z.object({ otp: z.number().int().min(0).max(99) });

// `expiresAt` and `codeExpiresAt` are the server's clock (epoch ms); the client counts down from
// the `...InMs` fields on its own clock, since a viewer's clock may be off
export const qrStartOutputSchema = z.object({
  qr: z.string(),
  expiresAt: z.number(),
  expiresInMs: z.number(),
});

export const qrPollOutputSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("waiting"), expiresAt: z.number(), expiresInMs: z.number() }),
  z.object({
    state: z.literal("code"),
    nickname: z.string().nullable(),
    codeExpiresAt: z.number(),
    codeExpiresInMs: z.number(),
  }),
  z.object({ state: z.literal("expired") }),
]);

export const qrCertifyOutputSchema = z.object({ nickname: z.string() });

/** `confirmed` is false when Cosmo's sign-out was not confirmed (or was skipped): the section says so. */
export const disconnectOutputSchema = z.object({ confirmed: z.boolean() });

export const sessionIdInputSchema = z.object({ id: z.number().int().positive() });

// Must match the CHECK on `cosmo_session.last_error`
export const COSMO_SESSION_ERRORS = [
  "session_dead",
  "session_expired",
  "cosmo_unavailable",
  "unexpected_response",
  "key_unreadable",
] as const;

// Never a cookie field, a user field or anything else of the row's: the owner sees this and no more
export const cosmoSessionRowSchema = z.object({
  id: z.number().int(),
  nickname: z.string(),
  address: z.string(),
  createdAt: z.string(),
  /** When the session ends: 180 days after connect, or Cosmo's own expiry when sooner. */
  expiresAt: z.string(),
  lastSyncedAt: z.string().nullable(),
  lastSync: z
    .object({
      seen: z.number().int(),
      recorded: z.number().int(),
      applied: z.number().int(),
      skipped: z.number().int(),
    })
    .nullable(),
  lastError: z.enum(COSMO_SESSION_ERRORS).nullable(),
  dead: z.boolean(),
  syncRequested: z.boolean(),
});
export type CosmoSessionRow = z.infer<typeof cosmoSessionRowSchema>;

export const cosmoSessionListSchema = z.object({
  /** False when `COSMO_SESSION_KEY` or `COSMO_BROWSER_URL` is unset: connecting is off. */
  available: z.boolean(),
  sessions: z.array(cosmoSessionRowSchema),
});
export type CosmoSessionList = z.infer<typeof cosmoSessionListSchema>;

/** Counts for staff: never an address, a nickname or a user. */
export const cosmoMediaSummarySchema = z.object({
  live: z.number().int(),
  signedOut: z.number().int(),
  recorded: z.number().int(),
  lastSyncedAt: z.string().nullable(),
});
export type CosmoMediaSummary = z.infer<typeof cosmoMediaSummarySchema>;
