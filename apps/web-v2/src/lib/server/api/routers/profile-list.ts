import { ORPCError } from "@orpc/client";
import { isEqual } from "date-fns";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as z from "zod/v4";
import type { Outputs } from "@/lib/orpc/server";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import type { OwnedObjekt } from "@/lib/universal/objekts";
import { parseSelectedArtists } from "../../cookie";
import { db } from "../../db";
import { indexer } from "../../db/indexer";
import { collections, objekts } from "../../db/indexer/schema";
import { type ProfileListEntry, profileListEntries } from "../../db/schema";
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
        columns: {
          address: true,
        },
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
        where: (lists, { eq, and }) => and(eq(lists.slug, slug)),
      });

      if (!result) throw new ORPCError("NOT_FOUND");

      return await mapEntriesObjekt(result.entries, result.address, artists);
    }),

  list: authed
    .input(z.object({ address: z.string() }))
    .handler(async ({ context: { session }, input: { address } }) => {
      const { user } = session;
      const result = await fetchOwnedProfileLists(user.id, address);
      return result;
    }),

  addObjekts: authed
    .input(
      z.object({
        slug: z.string(),
        objektIds: z.string().array(),
      }),
    )
    .handler(
      async ({
        input: { slug, objektIds },
        context: {
          session: { user },
        },
      }) => {
        const artists = await parseSelectedArtists();
        const list = await findOwnedProfileList(slug, user.id);

        if (objektIds.length === 0) return [];

        const ownedObjekts = await indexer
          .select({
            id: objekts.id,
            receivedAt: objekts.receivedAt,
          })
          .from(objekts)
          .where(
            and(eq(objekts.owner, list.address.toLowerCase()), inArray(objekts.id, objektIds)),
          );

        if (ownedObjekts.length === 0) return [];

        const result = await db
          .insert(profileListEntries)
          .values(
            ownedObjekts.map((objekt) => ({
              listId: list.id,
              objektId: objekt.id,
              tokenId: Number(objekt.id),
              receivedAt: objekt.receivedAt,
            })),
          )
          .onConflictDoUpdate({
            target: [profileListEntries.listId, profileListEntries.objektId],
            set: {
              receivedAt: sql.raw(`excluded.${profileListEntries.receivedAt.name}`),
            },
          })
          .returning();

        return await mapEntriesObjekt(result, list.address, artists);
      },
    ),

  removeObjekts: authed
    .input(
      z.object({
        slug: z.string(),
        ids: z.number().array(),
      }),
    )
    .handler(
      async ({
        input: { slug, ids },
        context: {
          session: { user },
        },
      }) => {
        const list = await findOwnedProfileList(slug, user.id);

        if (ids.length === 0) return;

        await db
          .delete(profileListEntries)
          .where(and(inArray(profileListEntries.id, ids), eq(profileListEntries.listId, list.id)));
      },
    ),
};

export type ProfileListEntriesOutput = Outputs["profileList"]["listEntries"];

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

export async function fetchOwnedProfileLists(userId: string, address: string) {
  const result = await db.query.profileLists.findMany({
    columns: {
      name: true,
      slug: true,
      address: true,
    },
    where: (lists, { eq, and }) => and(eq(lists.userId, userId), eq(lists.address, address)),
    orderBy: (lists, { desc }) => [desc(lists.id)],
  });
  return result;
}

async function findOwnedProfileList(slug: string, userId: string) {
  const list = await db.query.profileLists.findFirst({
    columns: {
      id: true,
      address: true,
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

async function mapEntriesObjekt(
  entries: Pick<ProfileListEntry, "id" | "createdAt" | "objektId" | "receivedAt">[],
  address: string,
  artists: ValidArtist[],
) {
  const ids = entries.map((a) => a.objektId);
  const entryMap = new Map(entries.map((a) => [a.objektId, a]));

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
      objekt.owner.toLowerCase() !== address.toLowerCase() ||
      isEqual(objekt.receivedAt, entry.receivedAt) === false
    ) {
      entryRemoveIds.push(entry.id);
    } else {
      owned.push({
        ...mapOwnedObjekt(objekt, collection),
        id: entry.id.toString(),
        receivedAt: entry.createdAt,
      });
    }
  }

  // clear moved objekt entry
  if (entryRemoveIds.length > 0) {
    await db.delete(profileListEntries).where(inArray(profileListEntries.id, entryRemoveIds));
  }

  return owned;
}
