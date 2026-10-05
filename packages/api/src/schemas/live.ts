import type { LiveSession } from "@repo/cosmo/types/live";
import * as z from "zod";

import { artistSchema } from "./common/artist";

export const liveSessionsInputSchema = z.object({ artistId: artistSchema });

export const liveSessionsOutputSchema = z.array(
  z.object({
    id: z.number().int(),
    thumbnailImage: z.string(),
    startedAt: z.string(),
    endedAt: z.string().nullable(),
    videoCallId: z.string(),
    chatChannelId: z.string(),
    slowModeSecond: z.number().int(),
    status: z.enum(["in_progress", "ended"]),
    createdAt: z.string(),
    updatedAt: z.string(),
    channel: z.object({
      id: z.number().int(),
      name: z.string(),
      profileImageUrl: z.string(),
      primaryColorHex: z.string(),
      isConnected: z.boolean(),
    }),
    title: z.string(),
  }),
) satisfies z.ZodType<LiveSession[]>;
