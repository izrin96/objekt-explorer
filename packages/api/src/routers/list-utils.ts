import { ORPCError } from "@orpc/server";
import * as z from "zod";

import { refuse } from "../lib/refuse";
import { authed, pub } from "../orpc";
import { errorResponses } from "../schemas/common/documented";
import {
  generateDiscordFormatInputSchema,
  listExportInputSchema,
  setRatioInputSchema,
  updateEntryPricesInputSchema,
} from "../schemas/list";
import { takesRatio } from "../schemas/trade-ratio";
import { assertTakesPrices, setEntryPrices, setEntryRatio } from "../services/list/entries";
import { fetchPartialOwnedListCollections } from "../services/list/entry-view";
import { exportListCsv } from "../services/list/export";
import { findHeldList } from "../services/list/read";
import { ownRuleLines } from "../services/list/rules";

export const listUtils = {
  updateEntryPrices: authed.input(updateEntryPricesInputSchema).handler(
    async ({
      input: { slug, updates },
      context: {
        session: { user },
      },
    }) => {
      if (updates.length === 0) return;

      const list = await findHeldList(slug, user.id);

      assertTakesPrices(list);

      await setEntryPrices(list.id, updates);
    },
  ),

  /** Not a bump: the write moves `updated_at` only, so the post keeps its place in the feed. */
  setRatio: authed.input(setRatioInputSchema).handler(
    async ({
      input: { slug, entryIds, ratio },
      context: {
        session: { user },
      },
    }) => {
      const list = await findHeldList(slug, user.id);
      if (!takesRatio(list.listType)) {
        refuse("BAD_REQUEST", "list_ratio_list_type", "Only have and want lists take a ratio");
      }
      await setEntryRatio(list.id, entryIds, ratio);
    },
  ),

  generateDiscordFormat: authed.input(generateDiscordFormatInputSchema).handler(
    async ({
      input: { haveListSlug, wantListSlug },
      context: {
        session: { user },
      },
    }) => {
      const [haveCollections, wantCollections, wantRules] = await Promise.all([
        haveListSlug ? fetchPartialOwnedListCollections(haveListSlug, user.id) : null,
        wantListSlug ? fetchPartialOwnedListCollections(wantListSlug, user.id) : null,
        wantListSlug ? ownRuleLines(wantListSlug, user.id) : [],
      ]);

      // `wantRules` comes before the want objekts; a tab that predates it ignores it
      return { have: haveCollections ?? [], want: wantCollections ?? [], wantRules };
    },
  ),

  export: pub
    .route({
      method: "GET",
      path: "/lists/{slug}/export",
      tags: ["Lists"],
      summary: "A list's entries as a CSV file",
      spec: errorResponses(400, 404),
    })
    .input(listExportInputSchema)
    .output(z.file().mime("text/csv"))
    .handler(async ({ input: { slug, artist: artists } }) => {
      const exported = await exportListCsv(slug, artists);
      if (!exported) throw new ORPCError("NOT_FOUND");
      return new File([exported.csv], `Export - ${exported.slug}.csv`, { type: "text/csv" });
    }),
};
