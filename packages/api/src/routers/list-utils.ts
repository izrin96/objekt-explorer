import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { listEntries } from "@repo/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import * as z from "zod";

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
import { buildListEntries, fetchPartialOwnedListCollections } from "../services/list/entry-view";
import { fetchListWithEntries, findOwnedList } from "../services/list/read";
import { fetchRuleDefs } from "../services/list/rules";
import { touchList } from "../services/list/shared";
import { escapeCSV } from "../services/utils";

async function ruleLines(slug: string, userId: string) {
  const list = await db.query.lists.findFirst({ columns: { id: true }, where: { slug, userId } });
  if (!list) return [];
  return ((await fetchRuleDefs([list.id])).get(list.id) ?? []).map(ruleLine);
}

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

      // Only sale lists can set prices
      if (list.listType !== "sale") {
        refuse("BAD_REQUEST", "list_prices_sale_only", "Only sale lists can set prices");
      }

      // one statement for the whole batch; an omitted note keeps the stored one
      await db.execute(sql`
          UPDATE ${listEntries}
          SET price = v.price,
              is_qyop = v.is_qyop,
              note = CASE WHEN v.has_note THEN v.note ELSE ${listEntries.note} END
          FROM unnest(
            ${sql.param(updates.map((u) => u.entryId))}::int[],
            ${sql.param(updates.map((u) => u.price))}::real[],
            ${sql.param(updates.map((u) => u.isQyop))}::boolean[],
            ${sql.param(updates.map((u) => u.note !== undefined))}::boolean[],
            ${sql.param(updates.map((u) => u.note ?? null))}::varchar[]
          ) AS v(id, price, is_qyop, has_note, note)
          WHERE ${listEntries.id} = v.id AND ${listEntries.listId} = ${list.id}
        `);
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
      if (!takesRatio(list.listType)) {
        refuse("BAD_REQUEST", "list_ratio_list_type", "Only have and want lists take a ratio");
      }
      const ids = [...new Set(entryIds)];
      // one array parameter, not one per id: a list holds up to 50,000 entries
      const inIds = sql`${listEntries.id} = ANY(${sql.param(ids)}::int[])`;
      const ownEntries = and(inIds, eq(listEntries.listId, list.id), isNull(listEntries.ruleId));
      // a refused request changes nothing, so every id is checked before the write
      await db.transaction(async (tx) => {
        const found = await tx
          .select({ id: listEntries.id })
          .from(listEntries)
          .where(ownEntries)
          .for("update");
        if (found.length !== ids.length) {
          refuse(
            "BAD_REQUEST",
            "list_ratio_entry",
            "A rule's objekts take the rule's ratio, and every entry must be on the list",
          );
        }
        await tx.update(listEntries).set({ ratio }).where(ownEntries);
      });
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
        wantListSlug ? ruleLines(wantListSlug, user.id) : [],
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
