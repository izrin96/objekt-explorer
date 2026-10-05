import * as z from "zod";

export const transferRowSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  timestamp: z.string(),
});

export const transferNicknamesSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
