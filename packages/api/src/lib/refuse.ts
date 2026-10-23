import { ORPCError } from "@orpc/server";

import type { COMPARE_REFUSALS } from "../schemas/compare";
import type { COSMO_LINK_REFUSALS } from "../schemas/cosmo-link";
import type { LIST_REFUSALS } from "../schemas/list";
import type { OBJEKT_REFUSALS } from "../schemas/objekts";
import type { PROFILE_REFUSALS } from "../schemas/profile";
import type { TRADE_MODE_REFUSALS, TRADE_POST_REFUSALS } from "../schemas/trade";
import type { DELETE_REFUSALS, USER_REFUSALS } from "../schemas/user";

export type Refusal =
  | (typeof LIST_REFUSALS)[number]
  | (typeof TRADE_MODE_REFUSALS)[number]
  | (typeof TRADE_POST_REFUSALS)[number]
  | (typeof COMPARE_REFUSALS)[number]
  | (typeof COSMO_LINK_REFUSALS)[number]
  | (typeof PROFILE_REFUSALS)[number]
  | (typeof USER_REFUSALS)[number]
  | (typeof DELETE_REFUSALS)[number]
  | (typeof OBJEKT_REFUSALS)[number];

/** `message` is English and never shown by the web app; it serves old tabs and `/api/v1` callers. */
export function refuse(
  status: ConstructorParameters<typeof ORPCError>[0],
  reason: Refusal,
  message: string,
  data: Record<string, unknown> = {},
): never {
  throw new ORPCError(status, { message, data: { reason, ...data } });
}
