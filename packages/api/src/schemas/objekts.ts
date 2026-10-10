import type { ValidObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

import { artistsArraySchema } from "./common/artist";
import { checkpointSchema } from "./common/checkpoint";
import { receivedAtCursorSchema } from "./common/cursor";
import { heldObjektSchema, ownedObjektSchema } from "./common/objekt";

/** A card's total and its latest few artworks, newest first. */
export type ObjektPreview = { count: number; objekts: ValidObjekt[] };

export const ownedByFiltersSchema = z.object({
  at: checkpointSchema.optional(),
  cursor: receivedAtCursorSchema.optional(),
  artist: artistsArraySchema.optional(),
});

export type OwnedByFilters = z.infer<typeof ownedByFiltersSchema>;

export const ownedByOutputSchema = z.object({
  nextCursor: receivedAtCursorSchema.optional(),
  objekts: z.array(ownedObjektSchema),
});
export type OwnedByOutput = z.infer<typeof ownedByOutputSchema>;

export const heldByOutputSchema = z.object({
  collections: z.array(heldObjektSchema),
});
export type HeldByOutput = z.infer<typeof heldByOutputSchema>;

export const ownedByInputSchema = ownedByFiltersSchema.extend({ address: z.string() });

export const heldByInputSchema = ownedByFiltersSchema
  .pick({ artist: true })
  .extend({ address: z.string() });
