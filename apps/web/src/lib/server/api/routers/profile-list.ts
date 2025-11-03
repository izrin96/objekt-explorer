import { ORPCError } from "@orpc/client";
import { isEqual } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";
import { after } from "next/server";
import * as z from "zod/v4";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import type { OwnedObjekt } from "@/lib/universal/objekts";
import { parseSelectedArtists } from "../../cookie";
import { db } from "../../db";
import { indexer } from "../../db/indexer";
import { collections, objekts } from "../../db/indexer/schema";
import { profileListEntries } from "../../db/schema";
import { mapOwnedObjekt } from "../../objekt";
import { getCollectionColumns } from "../../objekts/objekt-index";
import { authed, pub } from "../orpc";

export const profileListRouter = {
  find: authed
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .handler(async ({ input: { slug }, context: { session } }) => {
      const result = await db.query.profileLists.findFirst({
        columns: {
          name: true,
          address: true,
          gridColumns: true,
        },
        with: {
          userAddress: {
            columns: {
              nickname: true,
            },
          },
        },
        where: (lists, { eq, and }) => and(eq(lists.slug, slug), eq(lists.userId, session.user.id)),
      });

      if (!result) throw new ORPCError("NOT_FOUND");

      return result;
    }),

  listEntries: pub
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .handler(async ({ input: { slug } }) => {
      const artists = await parseSelectedArtists();
      const result = await db.query.profileLists.findFirst({
        with: {
          entries: {
            orderBy: (entries, { desc }) => [desc(entries.id)],
            columns: {
              id: true,
              createdAt: true,
              objektId: true,
              receivedAt: true,
            },
          },
        },
        where: (lists, { eq }) => eq(lists.slug, slug),
      });

      if (!result) throw new ORPCError("NOT_FOUND");

      const ids = result.entries.map((a) => a.objektId);
      const entryMap = new Map(result.entries.map((a) => [a.objektId, a]));

      if (ids.length === 0) return [];

      // get objekt and collection from indexer
      const objekts = await getObjektByIds(ids, artists);

      // check if entry objekt moved
      const entryRemoveIds: number[] = [];
      const owned: OwnedObjekt[] = [];

      for (const { objekt, collection } of objekts) {
        const entry = entryMap.get(objekt.id);

        if (!entry) continue;

        if (
          objekt.owner.toLowerCase() !== result.address.toLowerCase() ||
          isEqual(objekt.receivedAt, entry.receivedAt) === false
        ) {
          entryRemoveIds.push(entry.id);
        } else {
          owned.push({
            ...mapOwnedObjekt(objekt, collection),
            receivedAt: entry.createdAt.toISOString(),
          });
        }
      }

      // clear moved objekt entry
      if (entryRemoveIds.length > 0) {
        after(async () => {
          await db.delete(profileListEntries).where(inArray(profileListEntries.id, entryRemoveIds));
        });
      }

      return owned;
    }),

  list: authed.handler(async ({ context: { session } }) => {
    const { user } = session;
    const result = await fetchOwnedProfileLists(user.id);
    return result;
  }),
};

async function getObjektByIds(ids: string[], artists: ValidArtist[]) {
  const result = await indexer
    .select({ objekt: objekts, collection: { ...getCollectionColumns() } })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        inArray(objekts.id, ids),
        ...(artists.length
          ? [
              inArray(
                collections.artist,
                artists.map((a) => a.toLowerCase()),
              ),
            ]
          : []),
      ),
    );

  return result;
}

export async function fetchOwnedProfileLists(userId: string) {
  const result = await db.query.profileLists.findMany({
    columns: {
      name: true,
      slug: true,
      address: true,
    },
    with: {
      userAddress: {
        columns: {
          nickname: true,
        },
      },
    },
    where: (lists, { eq }) => eq(lists.userId, userId),
    orderBy: (lists, { desc }) => [desc(lists.id)],
  });
  return result;
}

async function findOwnedProfileList(slug: string, userId: string) {
  const list = await db.query.profileLists.findFirst({
    columns: {
      id: true,
    },
    where: (lists, { eq, and }) => and(eq(lists.slug, slug), eq(lists.userId, userId)),
  });

  if (!list) throw new ORPCError("NOT_FOUND");

  return list;
}

export async function fetchProfileList(slug: string, address: string) {
  const result = await db.query.profileLists.findFirst({
    columns: {
      slug: true,
      name: true,
      address: true,
      gridColumns: true,
    },
    with: {
      userAddress: {
        columns: {
          nickname: true,
          hideNickname: true,
        },
      },
    },
    where: (lists, { eq, and }) => and(eq(lists.slug, slug), eq(lists.address, address)),
  });

  if (!result) return null;

  return {
    slug: result.slug,
    name: result.name,
    address: result.address,
    gridColumns: result.gridColumns,
    nickname: result.userAddress.hideNickname === true ? null : result.userAddress.nickname,
  };
}
