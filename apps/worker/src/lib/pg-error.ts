import { findPgError } from "@repo/lib/pg-error";

export const isUniqueViolation = (error: unknown) =>
  findPgError(error, (e) => e.code === "23505") !== null;
