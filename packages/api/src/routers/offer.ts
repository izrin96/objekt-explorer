import { authed } from "../orpc";
import {
  candidatesInputSchema,
  createOfferInputSchema,
  mineInputSchema,
  offerIdInputSchema,
  offerViewsInputSchema,
  rateInputSchema,
  suggestInputSchema,
  tradeIdInputSchema,
} from "../schemas/offer";
import {
  acceptOffer,
  cancelTrade,
  createOffer,
  fetchMine,
  fetchTrade,
  offerCandidates,
  offerViews,
  rateTrade,
  respondToOffer,
  suggestOffer,
} from "../services/offer";

export const offerRouter = {
  /** What the builder can pick: `mine` paged from the sender's wallet, `theirs` from the partner's allowed lists. */
  candidates: authed
    .input(candidatesInputSchema)
    .handler(async ({ input, context: { session } }) =>
      offerCandidates(session.user.id, new Date(session.user.createdAt), input),
    ),

  /** Counters the open offer sent to the caller, or replaces the caller's own. */
  create: authed
    .input(createOfferInputSchema)
    .handler(async ({ input, context: { session } }) =>
      createOffer(session.user.id, new Date(session.user.createdAt), input),
    ),

  /** Fresh cards for offers already in a thread; ids the viewer isn't a party to are dropped. */
  views: authed
    .input(offerViewsInputSchema)
    .handler(async ({ input: { ids }, context: { session } }) => offerViews(session.user.id, ids)),

  accept: authed
    .input(offerIdInputSchema)
    .handler(async ({ input: { offerId }, context: { session } }) =>
      acceptOffer(session.user.id, offerId),
    ),

  decline: authed
    .input(offerIdInputSchema)
    .handler(async ({ input: { offerId }, context: { session } }) =>
      respondToOffer(session.user.id, offerId, "decline"),
    ),

  withdraw: authed
    .input(offerIdInputSchema)
    .handler(async ({ input: { offerId }, context: { session } }) =>
      respondToOffer(session.user.id, offerId, "withdraw"),
    ),

  suggest: authed
    .input(suggestInputSchema)
    .handler(async ({ input: { partnerId }, context: { session } }) =>
      suggestOffer(session.user.id, partnerId),
    ),

  mine: authed
    .input(mineInputSchema)
    .handler(async ({ input: { cursor }, context: { session } }) =>
      fetchMine(session.user.id, cursor),
    ),

  trade: authed
    .input(tradeIdInputSchema)
    .handler(async ({ input: { tradeId }, context: { session } }) =>
      fetchTrade(session.user.id, tradeId),
    ),

  /** The viewer's rating of the other party on a completed trade; replaces their earlier one. */
  rate: authed
    .input(rateInputSchema)
    .handler(async ({ input: { tradeId, rating }, context: { session } }) =>
      rateTrade(session.user.id, tradeId, rating),
    ),

  cancelTrade: authed
    .input(tradeIdInputSchema)
    .handler(async ({ input: { tradeId }, context: { session } }) =>
      cancelTrade(session.user.id, tradeId),
    ),
};
