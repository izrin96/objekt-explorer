import * as z from "zod";

import { authed } from "../orpc";
import { findOwnedList } from "../services/list";
import { findTradePartners } from "../services/trade";

export const listTrades = {
  findTradePartners: authed
    .input(
      z.object({
        slug: z.string(),
        mode: z.enum(["have-to-want", "want-to-have", "both"]).optional(),
      }),
    )
    .handler(async ({ input: { slug, mode }, context: { session } }) => {
      const list = await findOwnedList(slug, session.user.id);
      return findTradePartners(list, mode, session.user.id);
    }),
};
