export const isUniqueViolation = (error: unknown) => {
  let cause: unknown = error;
  while (cause instanceof Error) {
    if ((cause as Error & { code?: string }).code === "23505") return true;
    cause = cause.cause;
  }
  return false;
};
