import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { listEntries } from "@repo/db/schema";
import { and, eq, inArray } from "drizzle-orm";

import { authed, optionalAuthed, pub, selectedArtistsMiddleware } from "../orpc";
import {
  addToListInputSchema,
  listPreviewsInputSchema,
  listSlugInputSchema,
  profileListsInputSchema,
  removeObjektsFromListInputSchema,
} from "../schemas/list";
import {
  addEntries,
  buildListEntries,
  fetchListPreviews,
  fetchListWithEntries,
  fetchOwnedLists,
  findOwnedList,
} from "../services/list";
import { isProfileHidden } from "../services/privacy";

export const listEntriesRouter = {
  listEntries: pub
    .use(selectedArtistsMiddleware)
    .input(listSlugInputSchema)
    .handler(async ({ input: { slug }, context: { artists } }) => {
      const result = await fetchListWithEntries(slug);

      if (!result) throw new ORPCError("NOT_FOUND");

      return buildListEntries(result.entries, result.isProfileBind, {
        artists,
        hideSerial: result.hideSerial,
      });
    }),

  /** A slug is the list's address, so it reveals no more than opening the list would. */
  listPreviews: pub
    .input(listPreviewsInputSchema)
    .handler(({ input: { slugs } }) => fetchListPreviews(slugs)),

  profileLists: optionalAuthed
    .input(profileListsInputSchema)
    .handler(async ({ input: { profileAddress }, context: { session } }) => {
      const owner = await db.query.userAddress.findFirst({
        columns: { privateProfile: true, userId: true },
        where: { address: profileAddress },
      });

      // Hide lists entirely for private profiles unless the requester owns
      // the profile.
      if (owner && isProfileHidden(owner, session?.user.id)) {
        return [];
      }

      return await fetchOwnedLists("profileAddress", profileAddress);
    }),

  addToList: authed.input(addToListInputSchema).handler(
    async ({
      input: { slug, skipDups, from },
      context: {
        session: { user },
      },
    }) => {
      const list = await findOwnedList(slug, user.id);
      const { rows, skipped } = await addEntries(list, from, skipDups);

      // unfiltered by the selected artists, so the entries are exactly what was added
      const entries =
        rows.length === 0
          ? []
          : await buildListEntries(rows, list.isProfileBind, { hideSerial: list.hideSerial });

      return { entries, skipped };
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
        .where(and(inArray(listEntries.id, entryIds), eq(listEntries.listId, list.id)))
        .returning({ id: listEntries.id });

      return { removed: rows.length };
    },
  ),
};
