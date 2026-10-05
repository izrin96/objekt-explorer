import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { listEntries } from "@repo/db/schema";
import { sql } from "drizzle-orm";
import * as z from "zod";

import { authed, pub } from "../orpc";
import { errorResponses } from "../schemas/common/documented";
import {
  generateDiscordFormatInputSchema,
  listEntriesInputSchema,
  updateEntryPricesInputSchema,
} from "../schemas/list";
import {
  buildListEntries,
  fetchListWithEntries,
  fetchPartialOwnedListCollections,
  findOwnedList,
} from "../services/list";
import { escapeCSV } from "../services/utils";

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
      if (list.listTypeNew !== "sale") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Only sale lists can set prices",
        });
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
    },
  ),

  generateDiscordFormat: authed.input(generateDiscordFormatInputSchema).handler(
    async ({
      input: { haveListSlug, wantListSlug },
      context: {
        session: { user },
      },
    }) => {
      const [haveCollections, wantCollections] = await Promise.all([
        haveListSlug ? fetchPartialOwnedListCollections(haveListSlug, user.id) : null,
        wantListSlug ? fetchPartialOwnedListCollections(wantListSlug, user.id) : null,
      ]);

      return { have: haveCollections ?? [], want: wantCollections ?? [] };
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

      const entries = await buildListEntries(result.entries, result.isProfileBind, {
        artists,
        hideSerial: result.hideSerial,
      });

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
      ];

      const csv = [
        headers.join(","),
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
          ]
            .map((v) => escapeCSV(String(v ?? "")))
            .join(","),
        ),
      ].join("\n");

      return new File([csv], `Export - ${result.slug}.csv`, { type: "text/csv" });
    }),
};
