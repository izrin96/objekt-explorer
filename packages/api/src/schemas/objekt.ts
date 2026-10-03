import type { HeldObjekt, IndexedObjekt, OwnedObjekt, ValidObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

/** How many artworks a card previews. */
export const OBJEKT_PREVIEW_SIZE = 5;

/** A card's total and its latest few artworks, newest first. */
export type ObjektPreview = { count: number; objekts: ValidObjekt[] };

export const collectionMetadataSchema = z.object({
  transferable: z.number(),
  total: z.number(),
  spin: z.number(),
});
export type CollectionMetadata = z.infer<typeof collectionMetadataSchema>;

export const objektTransferSchema = z.object({
  id: z.string(),
  to: z.string(),
  timestamp: z.string(),
  nickname: z.string().nullish(),
});
export type ObjektTransfer = z.infer<typeof objektTransferSchema>;

export const objektTransferResultSchema = z.object({
  hide: z.boolean().optional(),
  tokenId: z.string().optional(),
  owner: z.string().optional(),
  transferable: z.boolean().optional(),
  transfers: z.array(objektTransferSchema),
});
export type ObjektTransferResult = z.infer<typeof objektTransferResultSchema>;

const ownedObjektsCursorSchema = z.object({
  receivedAt: z.string(),
  id: z.string(),
});

export const ownedObjektsResultSchema = z.object({
  nextCursor: ownedObjektsCursorSchema.optional(),
  objekts: z.custom<OwnedObjekt[]>(),
  total: z.number().optional(),
});
export type OwnedObjektsResult = z.infer<typeof ownedObjektsResultSchema>;

export const collectionResultSchema = z.object({
  collections: z.custom<IndexedObjekt[]>(),
});
export type CollectionResult = z.infer<typeof collectionResultSchema>;

export const heldResultSchema = z.object({
  collections: z.custom<HeldObjekt[]>(),
});
export type HeldResult = z.infer<typeof heldResultSchema>;

/** every minted serial of a collection, and which of them were spun */
export type SerialList = { serials: number[]; spun: number[] };

export const holdersInputSchema = z.object({
  collectionSlug: z.string(),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(50).default(10),
});

export const holderBucketKeySchema = z.enum(["1", "2-4", "5-9", "10+"]);
export type HolderBucketKey = z.infer<typeof holderBucketKeySchema>;

export const holderRowSchema = z.object({
  rank: z.number(),
  copies: z.number(),
  /** null when the holder hides serials from this viewer */
  lowestSerial: z.number().nullable(),
  holder: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("public"),
      address: z.string(),
      nickname: z.string().nullable(),
    }),
    z.object({ kind: z.literal("private") }),
  ]),
  isViewer: z.boolean(),
});
export type HolderRow = z.infer<typeof holderRowSchema>;

export const holdersResultSchema = z.object({
  summary: z.object({
    holders: z.number(),
    copies: z.number(),
    buckets: z.array(
      z.object({ key: holderBucketKeySchema, holders: z.number(), copies: z.number() }),
    ),
  }),
  rows: z.array(holderRowSchema),
  /** the viewer's own holding addresses, filled on the first page only */
  viewer: z.array(holderRowSchema),
  nextOffset: z.number().optional(),
});
export type HoldersResult = z.infer<typeof holdersResultSchema>;
