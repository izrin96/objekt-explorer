import type { Outputs } from "@repo/api";
import { RENEW_NOTICE_DAYS } from "@repo/api/schemas/cosmo-session";

type QrPoll = Outputs["cosmoSession"]["qrPoll"];
type QrStart = Outputs["cosmoSession"]["qrStart"];

/**
 * Deadlines are epoch milliseconds on the viewer's clock: the local time an answer arrived plus
 * the milliseconds the server said were left, never the server's own timestamps.
 */
export type FlowState =
  | { kind: "minting" }
  | { kind: "qr"; qr: string; expiresAt: number }
  | { kind: "code"; nickname: string | null; codeExpiresAt: number }
  | { kind: "submitting"; nickname: string | null; codeExpiresAt: number }
  /** the code step again, after Cosmo rejected a code with time left */
  | { kind: "wrongCode"; nickname: string | null; codeExpiresAt: number }
  | { kind: "connected"; nickname: string }
  | { kind: "expired" }
  | { kind: "cosmoError" }
  | { kind: "unavailable" }
  | { kind: "busy" }
  | { kind: "limit" }
  | { kind: "notAllowed" }
  | { kind: "rateLimited" };

type Kind = FlowState["kind"];
type CodeStep = Extract<FlowState, { kind: "code" | "wrongCode" }>;

const isCodeStep = (state: FlowState): state is CodeStep =>
  state.kind === "code" || state.kind === "wrongCode";

export const minting = (): FlowState => ({ kind: "minting" });

/** `now` is the viewer's clock as the answer arrives. */
export const started = ({ qr, expiresInMs }: QrStart, now: number): FlowState => ({
  kind: "qr",
  qr,
  expiresAt: now + expiresInMs,
});

export const connected = (nickname: string): FlowState => ({ kind: "connected", nickname });

/** Only a code step sends a code; the countdown and the retry context carry over. */
export function submitting(state: FlowState): FlowState {
  if (!isCodeStep(state)) return state;
  return {
    kind: "submitting",
    nickname: state.nickname,
    codeExpiresAt: state.codeExpiresAt,
  };
}

/**
 * The status check's answer. It moves only the waiting steps: a poll that lands after a submit
 * started or the attempt ended must not undo it, and a code step never goes back to waiting.
 * `now` is the viewer's clock when the answer arrived.
 */
export function pollResult(state: FlowState, poll: QrPoll, now: number): FlowState {
  if (state.kind !== "qr" && !isCodeStep(state)) return state;
  if (poll.state === "expired") return { kind: "expired" };
  if (poll.state === "waiting") {
    return state.kind === "qr" ? { ...state, expiresAt: now + poll.expiresInMs } : state;
  }
  const codeExpiresAt = now + poll.codeExpiresInMs;
  if (state.kind === "wrongCode") return { ...state, codeExpiresAt };
  return { kind: "code", nickname: poll.nickname, codeExpiresAt };
}

/** A failed check keeps the dialog as it is, since the next check asks again; only an ended ticket ends it. */
export function pollRefused(state: FlowState, reason: string | null): FlowState {
  if (reason === "cosmo_session_expired" && (state.kind === "qr" || isCodeStep(state))) {
    return { kind: "expired" };
  }
  return state;
}

/** The countdown reaching 0:00 ends a waiting step; a code in flight is left to the server's answer. */
export function clockTick(state: FlowState, now: number): FlowState {
  if (state.kind === "qr" && state.expiresAt <= now) return { kind: "expired" };
  if (isCodeStep(state) && state.codeExpiresAt <= now) return { kind: "expired" };
  return state;
}

const REASON_KIND: Record<string, Kind> = {
  cosmo_session_expired: "expired",
  cosmo_session_cosmo_error: "cosmoError",
  cosmo_session_unavailable: "unavailable",
  cosmo_session_captcha: "unavailable",
  cosmo_session_busy: "busy",
  cosmo_session_limit: "limit",
  cosmo_session_not_allowed: "notAllowed",
  user_rate_limit: "rateLimited",
};

type Terminal = Extract<
  FlowState,
  {
    kind:
      | "expired"
      | "cosmoError"
      | "unavailable"
      | "busy"
      | "limit"
      | "notAllowed"
      | "rateLimited";
  }
>;

/**
 * A refused or failed start or code entry. The third wrong code of a ticket arrives as
 * `cosmo_session_expired`, so the field is never offered for a ticket the server deleted.
 */
export function refused(state: FlowState, reason: string | null): FlowState {
  if (reason === "cosmo_session_wrong_code" && state.kind === "submitting") {
    return {
      kind: "wrongCode",
      nickname: state.nickname,
      codeExpiresAt: state.codeExpiresAt,
    };
  }
  const kind = reason === null ? undefined : REASON_KIND[reason];
  if (kind) return { kind } as Terminal;
  // a dropped connection or a server failure: before a ticket nothing was fetched, after a code was
  // sent Cosmo may or may not have signed in, and the server deleted the ticket either way
  return { kind: state.kind === "submitting" ? "cosmoError" : "unavailable" };
}

/** Whether the dialog is checking the ticket: only while waiting for a scan or for the code. */
export const isPolling = (state: FlowState) => state.kind === "qr" || isCodeStep(state);

/** The retry control's wording: a fresh code after an expiry, otherwise "Try again"; none when retrying cannot help. */
export function retryLabel(state: FlowState): "new" | "again" | null {
  switch (state.kind) {
    case "expired":
      return "new";
    case "cosmoError":
    case "unavailable":
    case "busy":
    case "rateLimited":
      return "again";
    default:
      return null;
  }
}

/** `m:ss` until `expiresAt`, rounded up so 0:00 shows only once it has passed. */
export function remaining(expiresAt: number, now: number) {
  const seconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** The code field's value: digits only, at most 2. */
export const codeInput = (raw: string) => raw.replaceAll(/\D/g, "").slice(0, 2);

/** The number to send, or null for fewer than 2 digits ("07" is 7, which the schema takes). */
export function parseCode(value: string) {
  return /^\d{2}$/.test(value) ? Number(value) : null;
}

const DAY_MS = 86_400_000;

/**
 * Whole days left on a session when fewer than {@link RENEW_NOTICE_DAYS} remain (0 is the last
 * day), else null. Null too once it ended: that row already says signed out.
 */
export function expiryNotice(expiresAt: number, now: number) {
  const left = expiresAt - now;
  if (left <= 0 || left >= RENEW_NOTICE_DAYS * DAY_MS) return null;
  return Math.floor(left / DAY_MS);
}
