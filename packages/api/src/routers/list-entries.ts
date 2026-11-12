import { ORPCError } from "@orpc/server";

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
  dropReceivedInputSchema,
  removeObjektsFromListInputSchema,
} from "../schemas/list";
import { addEntries, assertTakesPrices, removeEntries } from "../services/list/entries";
import { buildListEntries } from "../services/list/entry-view";
import {
  fetchListPreviews,
  fetchListWithEntries,
  fetchProfileLists,
  findHeldList,
  findOwnedList,
} from "../services/list/read";
import { dropReceived } from "../services/list/received";
import { touchList } from "../services/list/shared";
import { refuseOverUserLimit } from "../services/redis";

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
      await refuseOverUserLimit("list-add", user.id, 60, 60);
      const list = await findHeldList(slug, user.id);
      const trimmed = note?.trim() || null;
      const priced = isQyop === true || price != null || trimmed !== null;
      if (priced) assertTakesPrices(list);
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

      const rows = await removeEntries(list.id, entryIds);

      if (rows.length > 0) await touchList([list.id]);

      return { removed: rows.length };
    },
  ),

  dropReceived: authed.input(dropReceivedInputSchema).handler(
    async ({
      input: { slug, collectionSlugs, always },
      context: {
        session: { user },
      },
    }) => {
      const list = await findOwnedList(slug, user.id);
      // the trade page offers it for want lists only; on another type it would drop real entries
      if (list.listType !== "want") throw new ORPCError("NOT_FOUND");

      const rows = await dropReceived(list.id, collectionSlugs, always);
      if (rows.length > 0 || always) await touchList([list.id]);

      return { removed: rows.length };
    },
  ),
};
