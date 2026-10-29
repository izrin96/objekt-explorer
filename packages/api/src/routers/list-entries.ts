import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { listEntries } from "@repo/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { refuse } from "../lib/refuse";
import { authed, pub } from "../orpc";
import { documented, errorResponses } from "../schemas/common/documented";
import {
  addToListInputSchema,
  listEntriesInputSchema,
  listEntriesOutputSchema,
  listPreviewsInputSchema,
  listPreviewsOutputSchema,
  profileListsInputSchema,
  profileListsOutputSchema,
  removeObjektsFromListInputSchema,
} from "../schemas/list";
import {
  addEntries,
  buildListEntries,
  fetchListPreviews,
  fetchListWithEntries,
  fetchProfileLists,
  findOwnedList,
  touchList,
} from "../services/list";

export const listEntriesRouter = {
  listEntries: pub
    .route({
      method: "GET",
      path: "/lists/{slug}/entries",
      tags: ["Lists"],
      summary: "A list's objekts, with their price and note",
      spec: errorResponses(400, 404),
    })
    .input(listEntriesInputSchema)
    .output(documented(listEntriesOutputSchema))
    .handler(async ({ input: { slug, artist: artists } }) => {
      const result = await fetchListWithEntries(slug);

      if (!result) throw new ORPCError("NOT_FOUND");

      return buildListEntries(result.entries, result.isProfileBind, {
        artists,
        hideSerial: result.hideSerial,
      });
    }),

  /** A slug is the list's address, so it reveals no more than opening the list would. */
  listPreviews: pub
    .route({
      method: "GET",
      path: "/lists/previews",
      tags: ["Lists"],
      summary: "Several lists' entry counts and latest artworks, by slug",
      spec: errorResponses(400),
    })
    .input(listPreviewsInputSchema)
    .output(documented(listPreviewsOutputSchema))
    .handler(({ input: { slugs } }) => fetchListPreviews(slugs)),

  profileLists: pub
    .route({
      method: "GET",
      path: "/profiles/{address}/lists",
      tags: ["Profiles"],
      summary: "A profile's lists",
      spec: errorResponses(400),
    })
    .input(profileListsInputSchema)
    .output(documented(profileListsOutputSchema))
    .handler(({ input }) => fetchProfileLists(input.address)),

  addToList: authed.input(addToListInputSchema).handler(
    async ({
      input: { slug, skipDups, from, price, isQyop, note },
      context: {
        session: { user },
      },
    }) => {
      const list = await findOwnedList(slug, user.id);
      const trimmed = note?.trim() || null;
      const priced = isQyop === true || price != null || trimmed !== null;
      if (priced && list.listType !== "sale") {
        refuse("BAD_REQUEST", "list_prices_sale_only", "Only sale lists can set prices");
      }
      const { rows, skipped, unowned } = await addEntries(
        list,
        from,
        skipDups,
        // a QYOP entry carries no price, and 0 is no price, as Set price saves them
        priced
          ? {
              price: isQyop === true || !price ? null : price,
              isQyop: isQyop === true,
              note: trimmed,
            }
          : undefined,
      );

      // unfiltered by the selected artists, so the entries are exactly what was added
      const entries =
        rows.length === 0
          ? []
          : await buildListEntries(rows, list.isProfileBind, { hideSerial: list.hideSerial });

      return { entries, skipped, unowned };
    },
  ),

  removeObjektsFromList: authed.input(removeObjektsFromListInputSchema).handler(
    async ({
      input: { slug, entryIds },
      context: {
        session: { user },
      },
    }) => {
      const list = await findOwnedList(slug, user.id);

      if (entryIds.length === 0) return { removed: 0 };

      // an entry already gone, say removed from another tab, is not counted
      const rows = await db
        .delete(listEntries)
        .where(
          and(
            inArray(listEntries.id, entryIds),
            eq(listEntries.listId, list.id),
            isNull(listEntries.ruleId),
          ),
        )
        .returning({ id: listEntries.id });

      if (rows.length > 0) await touchList([list.id]);

      return { removed: rows.length };
    },
  ),
};
