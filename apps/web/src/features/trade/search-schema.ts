import { tradeFilterSchema } from "@repo/api/schemas/trade";
import * as z from "zod";

export const tradeSearchSchema = z.object({
  filter: tradeFilterSchema.optional().catch(undefined),
  list: z.string().min(1).optional().catch(undefined),
});
