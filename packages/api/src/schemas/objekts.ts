import type { ValidObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

import { addressDescription } from "./common/address";
import { artistDescription, artistsArraySchema } from "./common/artist";
import { checkpointSchema } from "./common/checkpoint";
import { pageCursorDescription, receivedAtCursorSchema } from "./common/cursor";
import { heldObjektSchema, ownedObjektSchema } from "./common/objekt";

/** A card's total and its latest few artworks, newest first. */
export type ObjektPreview = { count: number; objekts: ValidObjekt[] };

export const ownedByFiltersSchema = z.object({
  at: checkpointSchema
    .optional()
    .meta({ description: "What the address held at this past time, as ISO 8601" }),
  cursor: receivedAtCursorSchema
    .optional()
    .meta({ description: pageCursorDescription(["receivedAt", "id"]) }),
  artist: artistsArraySchema.optional().meta({ description: artistDescription }),
});

export type OwnedByFilters = z.infer<typeof ownedByFiltersSchema>;

export const ownedByOutputSchema = z.object({
  nextCursor: receivedAtCursorSchema.optional(),
  objekts: z.array(ownedObjektSchema),
});
export type OwnedByOutput = z.infer<typeof ownedByOutputSchema>;

/** One owned copy without its collection, which a caller holding the collection list joins by `slug`. */
export const ownedCopySchema = z.object({
  /** the token id */
  id: z.string(),
  slug: z.string(),
  serial: z.number().int(),
  receivedAt: z.string(),
  mintedAt: z.string(),
  transferable: z.boolean(),
});
export type OwnedCopy = z.infer<typeof ownedCopySchema>;

export const ownedCopiesOutputSchema = z.object({
  nextCursor: receivedAtCursorSchema.optional(),
  copies: z.array(ownedCopySchema),
});
export type OwnedCopiesOutput = z.infer<typeof ownedCopiesOutputSchema>;

export const heldByOutputSchema = z.object({
  collections: z.array(heldObjektSchema),
});
export type HeldByOutput = z.infer<typeof heldByOutputSchema>;

export const ownedByInputSchema = ownedByFiltersSchema.extend({
  address: z.string().meta({ description: addressDescription }),
});

export const heldByInputSchema = ownedByFiltersSchema
  .pick({ artist: true })
  .extend({ address: z.string().meta({ description: addressDescription }) });

/** `data.reason` on a refused objekt read. */
export const OBJEKT_REFUSALS = ["objekt_checkpoint_unavailable"] as const;
