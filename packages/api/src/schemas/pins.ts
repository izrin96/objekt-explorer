import * as z from "zod";

import { addressSchema } from "./common/address";

export const movePinInputSchema = z.object({
  address: addressSchema,
  tokenId: z.number(),
  direction: z.enum(["up", "down"]),
});
