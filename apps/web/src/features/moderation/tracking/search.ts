import { DEFAULT_STAFF_RANGE, staffDaysSchema } from "@repo/api/schemas/staff-totals";
import * as z from "zod";

// the router's parseSearch leaves every value a string, so `?days=7` arrives as "7"
export const staffRangeSearchSchema = z.object({
  days: z.coerce.number().pipe(staffDaysSchema).catch(DEFAULT_STAFF_RANGE),
});
