import {
  validArtists,
  validCustomSorts,
  validOnlineTypes,
  validSortDirection,
} from "@repo/cosmo/types/common";
import * as z from "zod";

const cursorSchema = z.object({
  receivedAt: z.string().optional(),
  serial: z.coerce.number().optional(),
  collectionNo: z.string().optional(),
  id: z.string(),
});

export const ownedBySchema = z.object({
  at: z.string().optional(),
  cursor: cursorSchema.optional(),
  artist: z.enum(validArtists).array().optional(),
  member: z.array(z.string()).optional(),
  class: z.array(z.string()).optional(),
  season: z.array(z.string()).optional(),
  onOffline: z.array(z.enum(validOnlineTypes)).optional(),
  transferable: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  collection: z.string().array().optional(),
  sort: z.enum(validCustomSorts).optional(),
  sort_dir: z.enum(validSortDirection).optional(),
  limit: z.number().optional(),
});

export type OwnedBySchema = z.infer<typeof ownedBySchema>;
