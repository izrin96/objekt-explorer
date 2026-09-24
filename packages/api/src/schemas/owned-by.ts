import * as z from "zod";

import { artistsArraySchema } from "./artist";

const cursorSchema = z.object({
  receivedAt: z.string(),
  id: z.string(),
});

export const ownedBySchema = z.object({
  at: z.string().optional(),
  cursor: cursorSchema.optional(),
  artist: artistsArraySchema.optional(),
});

export type OwnedBySchema = z.infer<typeof ownedBySchema>;
