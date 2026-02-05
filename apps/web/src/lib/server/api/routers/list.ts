import type { ValidArtist } from "@repo/cosmo/types/common";

import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { type ListEntry, listEntries, lists } from "@repo/db/schema";
import { overrideCollection } from "@repo/lib/server/objekt";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as z from "zod";

import type { Outputs } from "@/lib/orpc/server";
import type { PublicList } from "@/lib/universal/user";

import { mapPublicUser } from "../../auth";
import { parseSelectedArtists } from "../../cookie";
import { getCollectionColumns } from "../../objekts/objekt-index";
import { authed, pub } from "../orpc";

export const listRouter = {
  find: authed.input(z.string()).handler(async ({ input: slug, context: { session } }) => {
    const result = await db.query.lists.findFirst({
      columns: {
        name: true,
        hideUser: true,
        gridColumns: true,
      },
      where: { slug, userId: session.user.id },
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
      const result = await db.query.lists.findFirst({
        with: {
          entries: {
            orderBy: {
              id: "desc",
            },
            columns: {
              id: true,
              createdAt: true,
              collectionSlug: true,
            },
          },
        },
        where: { slug },
      });

      if (!result) throw new ORPCError("NOT_FOUND");

      return mapEntriesCollection(result.entries, artists);
    }),

  list: authed.handler(async ({ context: { session } }) => {
    const { user } = session;
    const result = await fetchOwnedLists(user.id);
    return result;
  }),

  addObjektsToList: authed
    .input(
      z.object({
        slug: z.string(),
        skipDups: z.boolean(),
        collectionSlugs: z.string().array(),
      }),
    )
    .handler(
      async ({
        input: { slug, skipDups, collectionSlugs },
        context: {
          session: { user },
        },
      }) => {
        const artists = await parseSelectedArtists();
        const list = await findOwnedList(slug, user.id);

        if (skipDups) {
          const uniqueCollectionSlugs = Array.from(new Set(collectionSlugs));

          // get all slug that already inserted
          const entries = await db
            .selectDistinct({
              slug: listEntries.collectionSlug,
            })
            .from(listEntries)
            .where(eq(listEntries.listId, list.id));

          const existingSlugs = new Set(entries.map((a) => a.slug));
          const filtered = uniqueCollectionSlugs.filter((slug) => !existingSlugs.has(slug));

          if (filtered.length === 0) return [];

          const result = await db
            .insert(listEntries)
            .values(
              filtered.map((collectionSlug) => ({
                listId: list.id,
                collectionSlug: collectionSlug,
              })),
            )
            .returning();

          return mapEntriesCollection(
            result.toSorted((a, b) => b.id - a.id),
            artists,
          );
        }

        if (collectionSlugs.length === 0) return [];

        const result = await db
          .insert(listEntries)
          .values(
            collectionSlugs.map((collectionSlug) => ({
              listId: list.id,
              collectionSlug: collectionSlug,
            })),
          )
          .returning();

        return mapEntriesCollection(
          result.toSorted((a, b) => b.id - a.id),
          artists,
        );
      },
    ),

  removeObjektsFromList: authed
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
        const list = await findOwnedList(slug, user.id);

        if (ids.length === 0) return;

        await db
          .delete(listEntries)
          .where(and(inArray(listEntries.id, ids), eq(listEntries.listId, list.id)));
      },
    ),

  edit: authed
    .input(
      z.object({
        slug: z.string(),
        name: z.string().min(1).optional(),
        hideUser: z.boolean().optional(),
        gridColumns: z.number().min(2).max(18).optional().nullable(),
      }),
    )
    .handler(
      async ({
        input: { slug, ...rest },
        context: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        await db
          .update(lists)
          .set({
            ...rest,
          })
          .where(eq(lists.id, list.id));
      },
    ),

  delete: authed
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .handler(
      async ({
        input: { slug },
        context: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        await db.delete(lists).where(eq(lists.id, list.id));
      },
    ),

  create: authed
    .input(
      z.object({
        name: z.string().min(1),
        hideUser: z.boolean(),
      }),
    )
    .handler(
      async ({
        input: { name, hideUser },
        context: {
          session: { user },
        },
      }) => {
        await db.insert(lists).values({
          name: name,
          userId: user.id,
          slug: nanoid(9),
          hideUser: hideUser,
        });
      },
    ),

  generateDiscordFormat: authed
    .input(
      z.object({
        haveSlug: z.string().optional(),
        wantSlug: z.string().optional(),
      }),
    )
    .handler(async ({ input: { haveSlug, wantSlug } }) => {
      // get slugs to query
      const slugs = [haveSlug, wantSlug].filter((s) => s !== undefined);

      if (slugs.length === 0) {
        return { have: [], want: [] };
      }

      // get both list
      const foundLists = await db.query.lists.findMany({
        where: { slug: { in: slugs } },
        with: {
          entries: {
            columns: {
              collectionSlug: true,
            },
          },
        },
      });

      const uniqueCollectionSlug = new Set(
        foundLists.flatMap((a) => a.entries).map((a) => a.collectionSlug),
      );

      if (uniqueCollectionSlug.size === 0) return { have: [], want: [] };

      // get all collections based on both list
      const foundCollections = await indexer.query.collections.findMany({
        where: { slug: { in: Array.from(uniqueCollectionSlug) } },
        columns: {
          slug: true,
          season: true,
          collectionNo: true,
          member: true,
          artist: true,
          collectionId: true,
          class: true,
        },
      });

      const collectionsMap = new Map(foundCollections.map((c) => [c.slug, c]));

      // entry for both list
      const haveList = haveSlug ? foundLists.find((a) => a.slug === haveSlug) : undefined;
      const wantList = wantSlug ? foundLists.find((a) => a.slug === wantSlug) : undefined;

      const have =
        haveList?.entries
          .map((a) => collectionsMap.get(a.collectionSlug))
          .filter((c) => c !== undefined) ?? [];

      const want =
        wantList?.entries
          .map((a) => collectionsMap.get(a.collectionSlug))
          .filter((c) => c !== undefined) ?? [];

      return {
        have,
        want,
      };
    }),
};

export type ListEntriesOutput = Outputs["list"]["listEntries"];

export async function fetchList(slug: string): Promise<PublicList | null> {
  const result = await db.query.lists.findFirst({
    columns: {
      slug: true,
      name: true,
      hideUser: true,
      gridColumns: true,
    },
    with: {
      user: {
        columns: {
          name: true,
          username: true,
          image: true,
          discord: true,
          twitter: true,
          displayUsername: true,
          showSocial: true,
        },
      },
    },
    where: { slug },
  });

  if (!result) return null;

  return {
    name: result.name,
    slug: result.slug,
    gridColumns: result.gridColumns,
    user: result.hideUser || !result.user ? null : mapPublicUser(result.user),
  };
}

export async function fetchOwnedLists(userId: string) {
  const result = await db.query.lists.findMany({
    columns: {
      name: true,
      slug: true,
    },
    where: { userId },
    orderBy: { id: "desc" },
  });
  return result;
}

async function findOwnedList(slug: string, userId: string) {
  const list = await db.query.lists.findFirst({
    columns: {
      id: true,
    },
    where: { slug, userId },
  });

  if (!list) throw new ORPCError("NOT_FOUND");

  return list;
}

async function fetchCollections(slugs: string[], artists: ValidArtist[]) {
  const uniqueSlugs = new Set(slugs);

  if (uniqueSlugs.size === 0) return [];

  const result = await indexer
    .select({
      ...getCollectionColumns(),
    })
    .from(collections)
    .where(
      and(
        inArray(collections.slug, Array.from(uniqueSlugs)),
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

  return result.map(overrideCollection);
}

async function mapEntriesCollection(
  result: Pick<ListEntry, "collectionSlug" | "id" | "createdAt">[],
  artists: ValidArtist[],
) {
  const slugs = result.map((a) => a.collectionSlug);
  const collections = await fetchCollections(slugs, artists);
  const collectionsMap = new Map(collections.map((c) => [c.slug, c]));

  return result
    .filter((a) => collectionsMap.has(a.collectionSlug))
    .map(({ collectionSlug, id, createdAt }) =>
      Object.assign({}, collectionsMap.get(collectionSlug)!, {
        id: id.toString(),
        createdAt,
      }),
    );
}
