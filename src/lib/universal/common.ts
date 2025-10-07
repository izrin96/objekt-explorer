import * as z from "zod/v4";

export const cursorSchema = z
  .object({
    id: z.string(),
  })
  .optional();

export type Cursor = z.infer<typeof cursorSchema>;

export type ParsedDate = string | Date;
