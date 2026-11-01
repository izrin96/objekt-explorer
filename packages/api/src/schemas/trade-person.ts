import { realNickname, truncateAddress } from "@repo/lib/address";
import * as z from "zod";

export type AddressRef = { address: string; nickname: string | null };
export type LinkedProfile = AddressRef & { isDefault: boolean };

/** The profile the account made default while it is still linked, else its first linked one. */
export function defaultProfile<T extends LinkedProfile>(addresses: T[]): T | undefined {
  return addresses.find((info) => info.isDefault) ?? addresses[0];
}

/**
 * An account's Trade handle, `/trade/@<handle>`: its default profile's Cosmo nickname, else that
 * profile's address, lower-cased. Null with no linked profile. `addresses` are in link order.
 */
export function tradeHandle(addresses: LinkedProfile[]): string | null {
  const chosen = defaultProfile(addresses);
  if (!chosen) return null;
  return (realNickname(chosen.address, chosen.nickname) ?? chosen.address).toLowerCase();
}

const ADDRESS = /^0x[0-9a-f]{40}$/i;

/** Whether a handle names a profile by its address rather than its nickname. */
export function isAddressHandle(handle: string) {
  return ADDRESS.test(handle);
}

/** A handle as a page names its person: the nickname, or the shortened address. */
export function handleName(handle: string) {
  return isAddressHandle(handle) ? truncateAddress(handle) : handle;
}

const id = z.string().min(1).max(64);

/** One of the two: a handle as typed in a URL, or a user id from an older `person` link. */
export const tradePersonInputSchema = z
  .object({ handle: id.optional(), userId: id.optional() })
  .refine((input) => (input.handle === undefined) !== (input.userId === undefined), {
    message: "Pass a handle or a user id",
  });
export type TradePersonInput = z.infer<typeof tradePersonInputSchema>;

/** `handle` is the account's canonical one; null when it no longer has a linked profile. */
export const tradePersonOutputSchema = z.object({
  userId: z.string(),
  handle: z.string().nullable(),
});
