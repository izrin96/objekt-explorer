import { findPgError } from "@repo/lib/pg-error";

const SHORT_ID = /^[\w.-]{1,40}$/;

/**
 * A short tag for logging a failure: the pg `code` when the error or a cause carries one, else the
 * error's name. A driver error's message holds the query's parameters (cookies, ids), so a job
 * never logs the error itself.
 */
export function errorCode(error: unknown) {
  const pg = findPgError(error, (e) => typeof e.code === "string" && SHORT_ID.test(e.code));
  if (pg) return `pg ${pg.code}`;
  if (error instanceof Error && SHORT_ID.test(error.name)) return error.name;
  return "unknown";
}
