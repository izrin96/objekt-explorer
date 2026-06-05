import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { listEntries } from "@repo/db/schema";
import { and, eq } from "drizzle-orm";
import * as z from "zod";

import {
  buildListEntries,
  fetchListWithEntries,
  fetchPartialOwnedListCollections,
  findOwnedList,
} from "../../list.server";
import { escapeCSV } from "../../utils.server";
import { authed, pub, selectedArtistsMiddleware } from "../orpc";

export const listUtils = {
  updateEntryPrices: authed
    .input(
      z.object({
        slug: z.string(),
        updates: z.array(
          z.object({
            entryId: z.number(),
            price: z.number().nullable(),
            isQyop: z.boolean(),
            note: z.string().optional().nullable(),
          }),
        ),
      }),
    )
    .handler(
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

        await db.transaction(async (tx) => {
          for (const { entryId, price, isQyop, note } of updates) {
            await tx
              .update(listEntries)
              .set({ price, isQyop, note })
              .where(and(eq(listEntries.id, entryId), eq(listEntries.listId, list.id)));
          }
        });
      },
    ),

  generateDiscordFormat: authed
    .input(
      z.object({
        haveListSlug: z.string().optional(),
        wantListSlug: z.string().optional(),
      }),
    )
    .handler(
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
    .use(selectedArtistsMiddleware)
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input: { slug }, context: { artists } }) => {
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
