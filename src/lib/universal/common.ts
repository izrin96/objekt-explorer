import z from "zod/v4";

export const cursorSchema = z
  .object({
    timestamp: z.string().or(z.date()),
    id: z.string(),
  })
  .optional();

export type Cursor = z.infer<typeof cursorSchema>;

export type ParsedDate = string | Date;
