import { isAddress } from "@repo/lib";
import * as z from "zod";

export const addressSchema = z.string().refine((val) => isAddress(val));

export const addressInputSchema = z.object({ address: addressSchema });

/** `{ address }`, and also the bare address that `/rpc` clients built before it send. */
export const addressOrBareInputSchema = z.preprocess(
  (value: string | { address: string }) => (typeof value === "string" ? { address: value } : value),
  addressInputSchema,
);

export const addressTokenIdsInputSchema = z.object({
  address: addressSchema,
  tokenIds: z.number().array().max(50000),
});
