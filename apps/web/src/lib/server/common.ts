import * as z from "zod";

export const cursorSchema = z
  .object({
    id: z.string(),
  })
  .optional();
