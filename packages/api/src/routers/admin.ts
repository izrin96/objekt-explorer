import { adminOnly, moderator } from "../orpc";
import {
  bannersInputSchema,
  collectionSlugSchema,
  removeBannerInputSchema,
  setCollectionColorsInputSchema,
} from "../schemas/admin";
import {
  messageTotalsSchema,
  staffRangeInputSchema,
  staffTradeInputSchema,
  staffTradeSchema,
  trackerHealthSchema,
  tradeAttentionSchema,
  tradeTotalsSchema,
} from "../schemas/staff-totals";
import { bannerFeed, removeBanner } from "../services/admin/banners";
import {
  collectionColors,
  collectionOverrides,
  refreshCollections,
  setCollectionColors,
} from "../services/admin/collections";
import { messageTotals } from "../services/moderation/message-totals";
import { staffTrade } from "../services/moderation/staff-trade";
import { trackerHealth, tradeAttention, tradeTotals } from "../services/moderation/trade-tracking";

/** The staff area's own procedures; `/rpc` only, never `/api/v1`. */
export const adminRouter = {
  /** Current profile banners, newest change first, 30 a page. */
  banners: moderator
    .input(bannersInputSchema)
    .handler(({ input, context }) => bannerFeed(context.isAdmin, input.cursor)),

  /** Clears a banner, deletes its file and tells the holder why; refused when it changed. */
  removeBanner: moderator
    .input(removeBannerInputSchema)
    .handler(({ input, context }) => removeBanner(context.session.user.id, context.isAdmin, input)),

  collection: adminOnly
    .input(collectionSlugSchema)
    .handler(({ input }) => collectionColors(input.slug)),

  /** Every override with its source colours, the latest collection history and the list's date. */
  collectionOverrides: adminOnly.handler(() => collectionOverrides()),

  setCollectionColors: adminOnly
    .input(setCollectionColorsInputSchema)
    .handler(({ input, context }) => setCollectionColors(context.session.user.id, input)),

  refreshCollections: adminOnly.handler(({ context }) =>
    refreshCollections(context.session.user.id),
  ),

  /** Offer and trade counts per UTC day, at most 5 minutes old. */
  tradeTotals: moderator
    .input(staffRangeInputSchema)
    .output(tradeTotalsSchema)
    .handler(({ input }) => tradeTotals(input.days)),

  /** Trades that need a look, and the accounts at fault in repeated failures; live. */
  tradeAttention: moderator
    .input(staffRangeInputSchema)
    .output(tradeAttentionSchema)
    .handler(({ input }) => tradeAttention(input.days)),

  /** One trade for staff: legs, copies, requests and timeline, never a note or a message. */
  staffTrade: moderator
    .input(staffTradeInputSchema)
    .output(staffTradeSchema)
    .handler(({ input }) => staffTrade(input.tradeId)),

  /** The indexer reading and the verifier's last run, as the verifier stores them. */
  trackerHealth: moderator.output(trackerHealthSchema).handler(() => trackerHealth()),

  /** Message, conversation, flag, report and sanction counts per UTC day; counts only. */
  messageTotals: moderator
    .input(staffRangeInputSchema)
    .output(messageTotalsSchema)
    .handler(({ input }) => messageTotals(input.days)),
};
