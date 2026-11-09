import { optionalAuthed, pub } from "../orpc";
import { collectionSlugInputSchema } from "../schemas/common/collection";
import { documented, errorResponses } from "../schemas/common/documented";
import {
  currencyRatesOutputSchema,
  marketListingsInputSchema,
  marketListingsOutputSchema,
  viewerMarketListingsOutputSchema,
  marketStatsOutputSchema,
  marketSummaryOutputSchema,
  priceHistoryInputSchema,
  priceHistoryOutputSchema,
} from "../schemas/market";
import { getUsdRates } from "../services/market/currency-rates";
import { getPriceHistory } from "../services/market/history";
import { fetchMarketStats, findListings } from "../services/market/listings";
import { getMarketSummary } from "../services/market/summary";

export const marketRouter = {
  summary: pub
    .route({
      method: "GET",
      path: "/market",
      tags: ["Market"],
      summary: "Every collection on sale, with its listing count and floor price",
    })
    .output(documented(marketSummaryOutputSchema))
    .handler(() => getMarketSummary()),

  marketListings: pub
    .route({
      method: "GET",
      path: "/market/{collectionSlug}/listings",
      tags: ["Market"],
      summary: "One collection's listings, by price or by date",
      spec: errorResponses(400),
    })
    .input(marketListingsInputSchema)
    .output(documented(marketListingsOutputSchema))
    .handler(async ({ input }) => {
      const page = await findListings(input, null);
      // output validation does not strip keys, and the public API never had this one
      return { ...page, items: page.items.map(({ messageable: _, ...item }) => item) };
    }),

  /** The same listings for the site, with whether each seller can be messaged. */
  listingsForViewer: optionalAuthed
    .input(marketListingsInputSchema)
    .output(viewerMarketListingsOutputSchema)
    .handler(({ input, context: { session } }) => findListings(input, session?.user.id ?? null)),

  rates: pub
    .route({
      method: "GET",
      path: "/market/rates",
      tags: ["Market"],
      summary: "USD value of one unit of each currency",
    })
    .output(documented(currencyRatesOutputSchema))
    .handler(getUsdRates),

  stats: pub
    .route({
      method: "GET",
      path: "/market/{collectionSlug}/stats",
      tags: ["Market"],
      summary: "One collection's listing count, floor, median and highest price, and sellers",
    })
    .input(collectionSlugInputSchema)
    .output(documented(marketStatsOutputSchema))
    .handler(({ input }) => fetchMarketStats(input.collectionSlug)),

  priceHistory: pub
    .route({
      method: "GET",
      path: "/market/{collectionSlug}/history",
      tags: ["Market"],
      summary: "One collection's daily floor, median and listing count over a range",
      spec: errorResponses(400),
    })
    .input(priceHistoryInputSchema)
    .output(priceHistoryOutputSchema)
    .handler(({ input }) => getPriceHistory(input.collectionSlug, input.range)),
};
