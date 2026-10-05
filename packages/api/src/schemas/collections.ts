import * as z from "zod";

import { artistsArraySchema } from "./common/artist";
import { checkpointSchema } from "./common/checkpoint";
import { collectionSlugInputSchema } from "./common/collection";
import { indexedObjektSchema } from "./common/objekt";
import { transferRowSchema } from "./common/transfer";

export const collectionMetadataOutputSchema = z.object({
  transferable: z.number(),
  total: z.number(),
  spin: z.number(),
});
export type CollectionMetadataOutput = z.infer<typeof collectionMetadataOutputSchema>;

export const collectionRarityOutputSchema = z.array(
  z.object({ slug: z.string(), count: z.number() }),
);

const serialTransferSchema = transferRowSchema
  .pick({ id: true, to: true, timestamp: true })
  .extend({ nickname: z.string().nullish() });
export type SerialTransfer = z.infer<typeof serialTransferSchema>;

export const serialTransfersOutputSchema = z.object({
  hide: z.boolean().optional(),
  tokenId: z.string().optional(),
  owner: z.string().optional(),
  transferable: z.boolean().optional(),
  transfers: z.array(serialTransferSchema),
});
export type SerialTransfersOutput = z.infer<typeof serialTransfersOutputSchema>;

export const collectionListOutputSchema = z.object({
  collections: z.array(indexedObjektSchema),
});
export type CollectionListOutput = z.infer<typeof collectionListOutputSchema>;

/** every minted serial of a collection, and which of them were spun */
export const serialsOutputSchema = z.object({
  serials: z.array(z.number().int()),
  spun: z.array(z.number().int()),
});
export type SerialsOutput = z.infer<typeof serialsOutputSchema>;

export const holdersInputSchema = z.object({
  collectionSlug: z.string(),
  offset: z.coerce.number<number>().int().min(0).default(0),
  limit: z.coerce.number<number>().int().min(1).max(50).default(10),
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

export const holdersOutputSchema = z.object({
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
export type HoldersOutput = z.infer<typeof holdersOutputSchema>;

export const collectionListInputSchema = z.object({
  artist: artistsArraySchema.default([]),
  at: checkpointSchema.optional(),
});

export const serialTransfersInputSchema = collectionSlugInputSchema.extend({
  serial: z.coerce.number().int(),
});
