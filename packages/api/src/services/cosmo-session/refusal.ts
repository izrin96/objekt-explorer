import { refuse } from "../../lib/refuse";
import type { CosmoSessionRefusal } from "../../schemas/cosmo-session";

const REFUSALS: Record<CosmoSessionRefusal, [Parameters<typeof refuse>[0], string]> = {
  cosmo_session_unavailable: ["SERVICE_UNAVAILABLE", "Cosmo sign-in is unavailable, try again"],
  cosmo_session_busy: ["SERVICE_UNAVAILABLE", "Many people are connecting, try again in a minute"],
  cosmo_session_captcha: ["BAD_GATEWAY", "Cosmo refused the request, try again"],
  cosmo_session_expired: ["BAD_REQUEST", "The sign-in expired, get a new code"],
  cosmo_session_wrong_code: ["BAD_REQUEST", "The code did not match"],
  cosmo_session_cosmo_error: ["BAD_GATEWAY", "Cosmo could not complete the sign-in"],
  cosmo_session_limit: ["CONFLICT", "Disconnect a Cosmo account first"],
  cosmo_session_not_allowed: ["FORBIDDEN", "This account cannot connect a Cosmo account"],
  cosmo_session_dead: ["CONFLICT", "That session is signed out, reconnect it"],
  cosmo_session_not_found: ["NOT_FOUND", "No such Cosmo session"],
};

/** One status and English message per code; the web app never renders the message. */
export function refuseSession(reason: CosmoSessionRefusal): never {
  const [status, message] = REFUSALS[reason];
  return refuse(status, reason, message);
}
