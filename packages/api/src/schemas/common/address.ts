import { isAddress } from "@repo/lib";
import * as z from "zod";

export const addressSchema = z.string().refine((val) => isAddress(val));

export const addressInputSchema = z.object({ address: addressSchema });

export const addressTokenIdsInputSchema = z.object({
  address: addressSchema,
  tokenIds: z.number().array().max(50000),
});
