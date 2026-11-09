import { authed } from "../orpc";
import {
  answerCancelInputSchema,
  candidatesInputSchema,
  createOfferInputSchema,
  legIdInputSchema,
  mineInputSchema,
  offerIdInputSchema,
  offerViewsInputSchema,
  rateInputSchema,
  substituteIdInputSchema,
  suggestInputSchema,
  tradeIdInputSchema,
} from "../schemas/offer";
import { createOffer, offerViews, respondToOffer } from "../services/offer";
import { acceptOffer } from "../services/offer/accept";
import { answerCancel, askCancel, withdrawCancel } from "../services/offer/cancel-request";
import { confirmLeg } from "../services/offer/confirm";
import { offerCandidates, suggestOffer } from "../services/offer/picker";
import { acceptSubstitute, declineSubstitute } from "../services/offer/substitute";
import { fetchMine } from "../services/offer/trade-history";
import { fetchTrade } from "../services/offer/trade-view";
import { cancelTrade, rateTrade } from "../services/offer/trades";
import { refuseOverUserLimit } from "../services/redis";

/** The picker pages and the suggestion share one budget: a minute of fast scrolling stays well under it. */
const limitPicker = (userId: string) => refuseOverUserLimit("offer-picker", userId, 120, 60);
// asking and withdrawing in a loop would add a Timeline row and a partner notice each round
const limitCancelAsk = (userId: string) =>
  refuseOverUserLimit("trade-cancel-ask", userId, 6, 60 * 60);

export const offerRouter = {
  /** What the builder can pick: `mine` paged from the sender's wallet, `theirs` from the partner's allowed lists. */
  candidates: authed
    .input(candidatesInputSchema)
    .handler(async ({ input, context: { session } }) => {
      await limitPicker(session.user.id);
      return offerCandidates(session.user.id, new Date(session.user.createdAt), input);
    }),

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

  suggest: authed.input(suggestInputSchema).handler(async ({ input, context: { session } }) => {
    await limitPicker(session.user.id);
    return suggestOffer(session.user.id, input);
  }),

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

  /** Either party asks to cancel a trade they can't cancel alone; the other party answers. */
  askCancel: authed
    .input(tradeIdInputSchema)
    .handler(async ({ input: { tradeId }, context: { session } }) => {
      await limitCancelAsk(session.user.id);
      return askCancel(session.user.id, tradeId);
    }),

  /** The party who didn't ask accepts, ending the trade cancelled by agreement, or declines. */
  answerCancel: authed
    .input(answerCancelInputSchema)
    .handler(async ({ input: { tradeId, accept }, context: { session } }) =>
      answerCancel(session.user.id, tradeId, accept),
    ),

  /** The asker takes back a request to cancel that is still waiting. */
  withdrawCancel: authed
    .input(tradeIdInputSchema)
    .handler(async ({ input: { tradeId }, context: { session } }) => {
      await limitCancelAsk(session.user.id);
      return withdrawCancel(session.user.id, tradeId);
    }),

  /** The receiver takes a wrong copy in place of the asked-for objekt, verifying its leg. */
  acceptSubstitute: authed
    .input(substituteIdInputSchema)
    .handler(async ({ input: { substituteId }, context: { session } }) =>
      acceptSubstitute(session.user.id, substituteId),
    ),

  /** The receiver turns a wrong copy down; the leg keeps waiting for its own objekt. */
  declineSubstitute: authed
    .input(substituteIdInputSchema)
    .handler(async ({ input: { substituteId }, context: { session } }) =>
      declineSubstitute(session.user.id, substituteId),
    ),

  /** The receiver marks a waiting leg as received, with no transfer behind it. */
  confirmLeg: authed
    .input(legIdInputSchema)
    .handler(async ({ input: { legId }, context: { session } }) =>
      confirmLeg(session.user.id, legId),
    ),
};
