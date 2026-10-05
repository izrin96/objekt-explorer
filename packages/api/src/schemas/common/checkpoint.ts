import * as z from "zod";

/**
 * A past instant from `?at=`. Anything `Date` parses is accepted and passed on
 * as ISO, so Postgres never sees a string it would reject with a 500.
 */
export const checkpointSchema = z.string().transform((value, ctx) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({ code: "custom", message: "Invalid date" });
    return z.NEVER;
  }
  return date.toISOString();
});
