import { Addresses } from "./index";

/** Valkey key of an address's cached held list; bump the version with the cached shape. */
export const heldKey = (addr: string) => `held-by:v3:${addr}`;

/** Spin's held list carries collection colours and media, so a write to either drops it. */
export const spinHeldKey = () => heldKey(Addresses.SPIN);
