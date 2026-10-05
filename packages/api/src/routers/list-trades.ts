import { authed } from "../orpc";
import { findTradePartnersInputSchema } from "../schemas/list";
import { findOwnedList } from "../services/list";
import { findTradePartners } from "../services/trade";

export const listTrades = {
  findTradePartners: authed
    .input(findTradePartnersInputSchema)
    .handler(async ({ input: { slug, mode }, context: { session } }) => {
      const list = await findOwnedList(slug, session.user.id);
      return findTradePartners(list, mode, session.user.id);
    }),
};
