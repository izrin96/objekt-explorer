/** The fields node-postgres puts on a database error. */
export type PgError = Error & { code?: string; constraint?: string; detail?: string };

/** The first error along `error`'s cause chain that `match` accepts; drizzle wraps the driver's. */
export function findPgError(error: unknown, match: (error: PgError) => boolean): PgError | null {
  let cause: unknown = error;
  while (cause instanceof Error) {
    if (match(cause as PgError)) return cause as PgError;
    cause = cause.cause;
  }
  return null;
}

export const isUniqueViolation = (error: unknown) =>
  findPgError(error, (e) => e.code === "23505") !== null;
