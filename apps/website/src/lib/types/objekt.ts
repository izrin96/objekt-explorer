import type { IndexedObjekt, OwnedObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

export const pinObjektSchema = z.object({
  tokenId: z.string(),
  order: z.number().nullable(),
});
export type PinObjekt = z.infer<typeof pinObjektSchema>;

export const lockObjektSchema = z.object({
  tokenId: z.string(),
});
export type LockObjekt = z.infer<typeof lockObjektSchema>;

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

export const ownedObjektsCursorSchema = z.object({
  receivedAt: z.string().optional(),
  serial: z.number().optional(),
  collectionNo: z.string().optional(),
  id: z.string(),
});
export type OwnedObjektsCursor = z.infer<typeof ownedObjektsCursorSchema>;

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
