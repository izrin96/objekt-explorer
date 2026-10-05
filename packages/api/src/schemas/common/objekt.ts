import { type IndexedArtist, validOnlineTypes } from "@repo/cosmo/types/common";
import type { HeldObjekt, IndexedObjekt, OwnedObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

const indexedArtistSchema = z.enum(["triples", "artms", "idntt"] satisfies IndexedArtist[]);

export const indexedObjektSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  slug: z.string(),
  collectionId: z.string(),
  season: z.string(),
  member: z.string(),
  members: z.array(z.string()),
  artist: indexedArtistSchema,
  collectionNo: z.string(),
  class: z.string(),
  thumbnailImage: z.string(),
  frontImage: z.string(),
  backImage: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  onOffline: z.enum(validOnlineTypes),
  bandImageUrl: z.string().nullable(),
  frontMedia: z.string().nullable(),
  hasAudio: z.boolean(),
  originalFrontImage: z.string(),
  originalBackImage: z.string(),
}) satisfies z.ZodType<IndexedObjekt>;

export const ownedObjektSchema = indexedObjektSchema.extend({
  tokenId: z.string(),
  serial: z.number().int(),
  mintedAt: z.string(),
  receivedAt: z.string(),
  transferable: z.boolean(),
}) satisfies z.ZodType<OwnedObjekt>;

export const heldObjektSchema = indexedObjektSchema.extend({
  copies: z.number().int(),
}) satisfies z.ZodType<HeldObjekt>;
