import { z } from "zod/v4";
import {
  authProcedure,
  createTRPCRouter,
  publicProcedure,
} from "@/lib/server/api/trpc";
import { Collection, collections } from "../../db/indexer/schema";
import { and, eq, inArray } from "drizzle-orm";
import { overrideColor } from "@/lib/universal/objekts";
import { indexer } from "../../db/indexer";
import { db } from "../../db";
import { getCollectionColumns } from "../../objekts/objekt-index";
import { TRPCError } from "@trpc/server";
import { List, listEntries, lists } from "../../db/schema";
import { nanoid } from "nanoid";
import { PublicUser } from "@/lib/universal/user";
import { mapPublicUser } from "../../auth";

export const listRouter = createTRPCRouter({
  get: authProcedure
    .input(z.string())
    .query(async ({ input: slug, ctx: { session } }) => {
      const result = await db.query.lists.findFirst({
        columns: {
          name: true,
          hideUser: true,
        },
        where: (lists, { eq, and }) =>
          and(eq(lists.slug, slug), eq(lists.userId, session.user.id)),
      });

      if (!result) throw new TRPCError({ code: "NOT_FOUND" });

      return result;
    }),

  getEntries: publicProcedure
    .input(z.string())
    .query(async ({ input: slug }) => {
      const result = await db.query.lists.findFirst({
        with: {
          entries: {
            orderBy: (entries, { desc }) => [desc(entries.id)],
            columns: {
              id: true,
              createdAt: true,
              collectionSlug: true,
            },
          },
        },
        where: (lists, { eq }) => eq(lists.slug, slug),
      });

      if (!result) throw new TRPCError({ code: "NOT_FOUND" });

      const slugs = result.entries.map((a) => a.collectionSlug);
      const collections = await fetchCollections(slugs);
      const collectionsMap = new Map(collections.map((c) => [c.slug, c]));

      return {
        name: result.name,
        collections: result.entries.map(
          ({ collectionSlug, id, createdAt }) => ({
            ...collectionsMap.get(collectionSlug)!,
            id: id.toString(),
            createdAt,
          })
        ),
      };
    }),

  myList: authProcedure.query(async ({ ctx: { session } }) => {
    const { user } = session;
    const result = await fetchOwnedLists(user.id);
    return result;
  }),

  addObjektsToList: authProcedure
    .input(
      z.object({
        slug: z.string(),
        skipDups: z.boolean(),
        collectionSlugs: z.string().array(),
      })
    )
    .mutation(
      async ({
        input: { slug, skipDups, collectionSlugs },
        ctx: {
          session: { user },
        },
      }) => {
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
          const filtered = uniqueCollectionSlugs.filter(
            (slug) => !existingSlugs.has(slug)
          );

          if (filtered.length < 1) return 0;

          await db.insert(listEntries).values(
            filtered.map((collectionSlug) => ({
              listId: list.id,
              collectionSlug: collectionSlug,
            }))
          );

          return filtered.length;
        }

        if (collectionSlugs.length < 1) return 0;

        await db.insert(listEntries).values(
          collectionSlugs.map((collectionSlug) => ({
            listId: list.id,
            collectionSlug: collectionSlug,
          }))
        );

        return collectionSlugs.length;
      }
    ),

  removeObjektsFromList: authProcedure
    .input(
      z.object({
        slug: z.string(),
        ids: z.number().array(),
      })
    )
    .mutation(
      async ({
        input: { slug, ids },
        ctx: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        if (ids.length < 1) return;

        await db
          .delete(listEntries)
          .where(
            and(inArray(listEntries.id, ids), eq(listEntries.listId, list.id))
          );
      }
    ),

  edit: authProcedure
    .input(
      z.object({
        slug: z.string(),
        name: z.string().min(1),
        hideUser: z.boolean(),
      })
    )
    .mutation(
      async ({
        input: { slug, name, hideUser },
        ctx: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        await db
          .update(lists)
          .set({
            name: name,
            hideUser: hideUser,
          })
          .where(eq(lists.id, list.id));
      }
    ),

  delete: authProcedure
    .input(
      z.object({
        slug: z.string(),
      })
    )
    .mutation(
      async ({
        input: { slug },
        ctx: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        await db.delete(lists).where(eq(lists.id, list.id));
      }
    ),

  create: authProcedure
    .input(
      z.object({
        name: z.string().min(1),
        hideUser: z.boolean(),
      })
    )
    .mutation(
      async ({
        input: { name, hideUser },
        ctx: {
          session: { user },
        },
      }) => {
        await db.insert(lists).values({
          name: name,
          userId: user.id,
          slug: nanoid(9),
          hideUser: hideUser,
        });
      }
    ),

  generateDiscordFormat: authProcedure
    .input(
      z.object({
        haveSlug: z.string(),
        wantSlug: z.string(),
      })
    )
    .mutation(async ({ input: { haveSlug, wantSlug } }) => {
      // get both list
      const lists = await db.query.lists.findMany({
        where: (t, { inArray }) => inArray(t.slug, [haveSlug, wantSlug]),
        with: {
          entries: {
            columns: {
              collectionSlug: true,
            },
          },
        },
      });

      const uniqueCollectionSlug = new Set(
        lists.flatMap((a) => a.entries).map((a) => a.collectionSlug)
      );

      // get all collections based on both list
      const collections = await indexer.query.collections.findMany({
        where: (t, { inArray }) =>
          inArray(t.slug, Array.from(uniqueCollectionSlug)),
        columns: {
          slug: true,
          season: true,
          collectionNo: true,
          member: true,
          artist: true,
        },
      });

      // entry for both list
      const haveList = lists.find((a) => a.slug === haveSlug);
      const wantList = lists.find((a) => a.slug === wantSlug);

      return {
        collections,
        have: haveList?.entries.map((a) => a.collectionSlug) ?? [],
        want: wantList?.entries.map((a) => a.collectionSlug) ?? [],
      };
    }),
});

export type CollectionFormat = Pick<
  Collection,
  "slug" | "member" | "season" | "collectionNo" | "artist"
>;

export type PublicList = Pick<List, "slug" | "name"> & {
  user?: PublicUser | null;
};

export async function fetchList(slug: string) {
  const result = await db.query.lists.findFirst({
    columns: {
      slug: true,
      name: true,
      hideUser: true,
    },
    with: {
      user: {
        columns: {
          name: true,
          username: true,
          image: true,
          discord: true,
          displayUsername: true,
          showSocial: true,
        },
      },
    },
    where: (lists, { eq }) => eq(lists.slug, slug),
  });

  if (!result) return null;

  return {
    ...result,
    user: result.hideUser ? null : mapPublicUser(result.user),
  };
}

export async function fetchOwnedLists(userId: string) {
  const result = await db.query.lists.findMany({
    columns: {
      name: true,
      slug: true,
    },
    where: (lists, { eq }) => eq(lists.userId, userId),
    orderBy: (lists, { desc }) => [desc(lists.id)],
  });
  return result;
}

async function findOwnedList(slug: string, userId: string) {
  const list = await db.query.lists.findFirst({
    columns: {
      id: true,
    },
    where: (lists, { eq, and }) =>
      and(eq(lists.slug, slug), eq(lists.userId, userId)),
  });

  if (!list) throw new TRPCError({ code: "NOT_FOUND" });

  return list;
}

async function fetchCollections(slugs: string[]) {
  const uniqueSlugs = new Set(slugs);

  const result = await indexer
    .select({
      ...getCollectionColumns(),
    })
    .from(collections)
    .where(inArray(collections.slug, Array.from(uniqueSlugs)));

  return result.map((collection) => ({
    ...collection,
    ...overrideColor(collection),
  }));
}
