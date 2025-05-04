import { z } from "zod";
import {
  authProcedure,
  createTRPCRouter,
  publicProcedure,
} from "@/lib/server/api/trpc";
import { collections } from "../../db/indexer/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { overrideColor } from "@/lib/universal/objekts";
import { indexer } from "../../db/indexer";
import { db } from "../../db";
import { getCollectionColumns } from "../../objekts/objekt-index";
import { TRPCError } from "@trpc/server";
import { listEntries, lists } from "../../db/schema";
import { nanoid } from "nanoid";

export const listRouter = createTRPCRouter({
  get: publicProcedure.input(z.string()).query(async ({ input: slug }) => {
    const result = await db.query.lists.findFirst({
      columns: {
        name: true,
      },
      with: {
        user: {
          columns: {
            name: true,
            image: true,
          },
        },
      },
      where: (lists, { eq }) => eq(lists.slug, slug),
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
            id,
            createdAt,
          })
        ),
      };
    }),

  myList: authProcedure.query(async ({ ctx: { session } }) => {
    const { user } = session;
    const result = await db.query.lists.findMany({
      columns: {
        name: true,
        slug: true,
      },
      where: (lists, { eq }) => eq(lists.userId, user.id),
      orderBy: (lists, { desc }) => [desc(lists.id)],
    });
    return result;
  }),

  addObjektsToList: authProcedure
    .input(
      z.object({
        slug: z.string(),
        collectionSlugs: z.string().array(),
      })
    )
    .mutation(
      async ({
        input: { slug, collectionSlugs },
        ctx: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        await db.insert(listEntries).values(
          collectionSlugs.map((collectionSlug) => ({
            listId: list.id,
            createdAt: sql`'now'`,
            collectionSlug: collectionSlug,
          }))
        );
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

        await db
          .delete(listEntries)
          .where(and(inArray(listEntries.id, ids), eq(lists.id, list.id)));
      }
    ),

  edit: authProcedure
    .input(
      z.object({
        slug: z.string(),
        name: z.string(),
      })
    )
    .mutation(
      async ({
        input: { slug, name },
        ctx: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        await db
          .update(lists)
          .set({
            name: name,
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
        name: z.string(),
      })
    )
    .mutation(
      async ({
        input: { name },
        ctx: {
          session: { user },
        },
      }) => {
        await db.insert(lists).values({
          name: name,
          userId: user.id,
          slug: nanoid(9),
          createdAt: sql`'now'`,
        });
      }
    ),
});

async function findOwnedList(slug: string, userId: string) {
  const list = await db.query.lists.findFirst({
    columns: {
      id: true,
    },
    where: (lists, { eq, and }) =>
      and(eq(lists.slug, slug), eq(lists.userId, userId)),
  });

  if (!list) throw new TRPCError({ code: "UNAUTHORIZED" });

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
