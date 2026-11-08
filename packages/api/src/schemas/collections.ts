import * as z from "zod";

import { artistsArraySchema } from "./common/artist";
import { checkpointSchema } from "./common/checkpoint";
import { collectionSlugInputSchema } from "./common/collection";
import { indexedObjektSchema } from "./common/objekt";
import { queryBoolean } from "./common/query";
import { transferRowSchema } from "./common/transfer";

export const collectionMetadataOutputSchema = z.object({
  transferable: z.number(),
  total: z.number(),
  spin: z.number(),
  serialEstimate: z.object({ min: z.number(), max: z.number().nullable() }).nullable().meta({
    description:
      "How many serials an offline collection has, estimated from its reserved token ranges. min equal to max is exact; max null means at least min, which is also how a recent A drop reads while members of it may still be minting; null means no estimate (online collections and Atom01).",
  }),
  // the Cosmo-hosted images, which the web's collection list leaves out
  originalFrontImage: z.string().optional(),
  originalBackImage: z.string().optional(),
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

/** The list as `ids: false` sends it. */
export const slimCollectionListOutputSchema = z.object({
  collections: z.array(indexedObjektSchema.omit({ id: true })),
});
export type SlimCollectionListOutput = z.infer<typeof slimCollectionListOutputSchema>;

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

const holderBucketKeySchema = z.enum(["1", "2-4", "5-9", "10+"]);
export type HolderBucketKey = z.infer<typeof holderBucketKeySchema>;

const holderRowSchema = z.object({
  rank: z.number(),
  copies: z.number(),
  lowestSerial: z.number().nullable(),
  /** `kind` stays for `/api/v1` callers written when a holder could be private */
  holder: z.object({
    kind: z.literal("public"),
    address: z.string(),
    nickname: z.string().nullable(),
  }),
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
  // the web sends false: the two Cosmo URLs are 43% of the gzipped list and only the drawer
  // shows them, read from the collection's metadata instead
  originals: queryBoolean
    .default(true)
    .meta({ description: "false leaves out originalFrontImage and originalBackImage" }),
  // the web sends false too and keys its rows by slug, which is unique: the ids are UUIDv7,
  // time-ordered (the list's order and Last-Modified follow them) but barely compressible, a third
  // of the gzipped list, and nothing the web sends back names a collection by its id
  ids: queryBoolean.default(true).meta({ description: "false leaves out each collection's id" }),
});

export type CollectionListInput = z.infer<typeof collectionListInputSchema>;

export const serialTransfersInputSchema = collectionSlugInputSchema.extend({
  serial: z.coerce.number().pipe(z.int32()),
});
