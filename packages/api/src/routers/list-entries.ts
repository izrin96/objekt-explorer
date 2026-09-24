import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { listEntries } from "@repo/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod";

import { authed, optionalAuthed, pub, selectedArtistsMiddleware } from "../orpc";
import type { AddSource } from "../schemas/list";
import { addSourceSchema } from "../schemas/list";
import {
  addEntries,
  buildListEntries,
  fetchListWithEntries,
  fetchOwnedLists,
  findOwnedList,
} from "../services/list";

export const listEntriesRouter = {
  listEntries: pub
    .use(selectedArtistsMiddleware)
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .handler(async ({ input: { slug }, context: { artists } }) => {
      const result = await fetchListWithEntries(slug);

      if (!result) throw new ORPCError("NOT_FOUND");

      return buildListEntries(result.entries, result.isProfileBind, {
        artists,
        hideSerial: result.hideSerial,
      });
    }),

  profileLists: optionalAuthed
    .input(
      z.object({
        profileAddress: z.string(),
      }),
    )
    .handler(async ({ input: { profileAddress }, context: { session } }) => {
      const owner = await db.query.userAddress.findFirst({
        columns: { privateProfile: true, userId: true },
        where: { address: profileAddress },
      });

      // Hide lists entirely for private profiles unless the requester owns
      // the profile.
      if (owner?.privateProfile && session?.user.id !== owner.userId) {
        return [];
      }

      return await fetchOwnedLists("profileAddress", profileAddress);
    }),

  /** The input shape clients shipped before `addToList`; kept until their tabs reload. */
  addObjektsToList: authed
    .use(selectedArtistsMiddleware)
    .input(
      z.object({
        slug: z.string(),
        skipDups: z.boolean(),
        collectionSlugs: z.string().array().max(50000).optional(),
        objekts: z.string().array().max(50000).optional(),
      }),
    )
    .handler(
      async ({
        input: { slug, skipDups, collectionSlugs, objekts: inputObjekts },
        context: {
          session: { user },
          artists,
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        let from: AddSource;
        if (list.isProfileBind && list.profileAddress) {
          if (!inputObjekts || inputObjekts.length === 0) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Objekts required for profile-bound lists",
            });
          }
          from = { type: "objekts", tokenIds: inputObjekts };
        } else {
          if (!collectionSlugs || collectionSlugs.length === 0) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Collections required for non-profile-bound lists",
            });
          }
          from = { type: "collections", slugs: collectionSlugs };
        }

        const { rows } = await addEntries(list, from, skipDups);
        if (rows.length === 0) return [];

        return buildListEntries(rows, list.isProfileBind, {
          artists,
          hideSerial: list.hideSerial,
        });
      },
    ),

  addToList: authed
    .input(
      z.object({
        slug: z.string(),
        skipDups: z.boolean(),
        from: addSourceSchema,
      }),
    )
    .handler(
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

  removeObjektsFromList: authed
    .input(
      z.object({
        slug: z.string(),
        entryIds: z.number().int().positive().array().max(50000),
      }),
    )
    .handler(
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
