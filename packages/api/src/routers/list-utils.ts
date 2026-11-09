import { ORPCError } from "@orpc/server";
import * as z from "zod";

import { escapeCSV } from "../lib/csv";
import { refuse } from "../lib/refuse";
import { authed, pub } from "../orpc";
import { errorResponses } from "../schemas/common/documented";
import {
  generateDiscordFormatInputSchema,
  listEntriesInputSchema,
  setRatioInputSchema,
  updateEntryPricesInputSchema,
} from "../schemas/list";
import { ruleLine } from "../schemas/list-rule";
import { takesRatio } from "../schemas/trade-ratio";
import { setEntryPrices, setEntryRatio } from "../services/list/entries";
import { buildListEntries, fetchPartialOwnedListCollections } from "../services/list/entry-view";
import { fetchListWithEntries, findOwnedList, refuseUnheldProfile } from "../services/list/read";
import { fetchRuleDefs, ownRuleLines } from "../services/list/rules";
import { touchList } from "../services/list/shared";

export const listUtils = {
  updateEntryPrices: authed.input(updateEntryPricesInputSchema).handler(
    async ({
      input: { slug, updates },
      context: {
        session: { user },
      },
    }) => {
      if (updates.length === 0) return;

      const list = await findOwnedList(slug, user.id);
      await refuseUnheldProfile(list, user.id);

      // Only sale lists can set prices
      if (list.listType !== "sale") {
        refuse("BAD_REQUEST", "list_prices_sale_only", "Only sale lists can set prices");
      }

      await setEntryPrices(list.id, updates);
      await touchList([list.id]);
    },
  ),

  /** Not a bump: `touchList` moves `updated_at` only, so the post keeps its place in the feed. */
  setRatio: authed.input(setRatioInputSchema).handler(
    async ({
      input: { slug, entryIds, ratio },
      context: {
        session: { user },
      },
    }) => {
      const list = await findOwnedList(slug, user.id);
      await refuseUnheldProfile(list, user.id);
      if (!takesRatio(list.listType)) {
        refuse("BAD_REQUEST", "list_ratio_list_type", "Only have and want lists take a ratio");
      }
      await setEntryRatio(list.id, entryIds, ratio);
      await touchList([list.id]);
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
    .input(listEntriesInputSchema)
    .output(z.file().mime("text/csv"))
    .handler(async ({ input: { slug, artist: artists } }) => {
      const result = await fetchListWithEntries(slug);

      if (!result) throw new ORPCError("NOT_FOUND");

      const [entries, rules] = await Promise.all([
        buildListEntries(result.entries, result.isProfileBind, {
          artists,
          hideSerial: result.hideSerial,
        }),
        fetchRuleDefs([result.id]),
      ]);

      const headers = [
        "collection_slug",
        "collection_id",
        "season",
        "member",
        "artist",
        "class",
        "collection_no",
        "on_offline",
        "serial",
        "token_id",
        "transferable",
        "price",
        "is_qyop",
        "note",
        "rule",
        // trailing, so a reader that goes by column position still works
        "ratio",
      ];
      const blank = Array.from({ length: headers.length - 2 }, () => "");
      // what the entry or rule reads: its own ratio, else the list's
      const ratioOf = (own: number | null) => String(own ?? result.ratio ?? "");

      const csv = [
        headers.join(","),
        // a want list's rules first, one row each, named in the last column
        ...(rules.get(result.id) ?? []).map((rule) =>
          [...blank, escapeCSV(ruleLine(rule)), ratioOf(rule.ratio)].join(","),
        ),
        ...entries.map((e) =>
          [
            e.slug,
            e.collectionId,
            e.season,
            e.member,
            e.artist,
            e.class,
            e.collectionNo,
            e.onOffline,
            "serial" in e ? e.serial : "",
            "tokenId" in e ? e.tokenId : "",
            "transferable" in e ? e.transferable : "",
            e.price,
            e.isQyop,
            e.note ?? "",
            "",
            ratioOf(e.ratio),
          ]
            .map((v) => escapeCSV(String(v ?? "")))
            .join(","),
        ),
      ].join("\n");

      return new File([csv], `Export - ${result.slug}.csv`, { type: "text/csv" });
    }),
};
