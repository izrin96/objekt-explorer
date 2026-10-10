import * as z from "zod";

import { checkpointSchema } from "./common/checkpoint";
import { timestampCursorSchema } from "./common/cursor";
import { collectionFiltersSchema } from "./common/filters";
import { ownedObjektSchema } from "./common/objekt";
import { transferNicknamesSchema, transferRowSchema } from "./common/transfer";

const transferItemSchema = z.object({
  transfer: transferRowSchema,
  objekt: ownedObjektSchema,
  nickname: transferNicknamesSchema,
});
export type TransferItem = z.infer<typeof transferItemSchema>;

export const addressTransfersOutputSchema = z.object({
  hide: z.boolean().optional(),
  results: z.array(transferItemSchema),
  nextCursor: timestampCursorSchema.optional(),
});
export type AddressTransfersOutput = z.infer<typeof addressTransfersOutputSchema>;

export const transferTypeSchema = z.enum(["all", "mint", "received", "sent", "spin"]);
export type TransferType = z.infer<typeof transferTypeSchema>;

/** an address's transfers input; the legacy `GET /api/transfers/$address` sends the cursor as JSON */
export const addressTransfersFiltersSchema = z.object({
  type: transferTypeSchema.default("all"),
  ...collectionFiltersSchema.shape,
  at: checkpointSchema.optional(),
  order: z.enum(["desc", "asc"]).default("desc"),
  cursor: timestampCursorSchema.optional(),
});
export type AddressTransfersFilters = z.infer<typeof addressTransfersFiltersSchema>;
/** what the client sends: an omitted facet reads as empty, and the cursor is added per page */
export type TransfersParams = Partial<
  Omit<z.input<typeof addressTransfersFiltersSchema>, "cursor">
>;

export const addressTransfersInputSchema = addressTransfersFiltersSchema.extend({
  address: z.string(),
});
