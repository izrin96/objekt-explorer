import { z } from "zod";
import {
  authProcedure,
  createTRPCRouter,
  publicProcedure,
} from "@/lib/server/api/trpc";
import { collections } from "../../db/indexer/schema";
import { inArray } from "drizzle-orm";
import { overrideColor } from "@/lib/universal/objekts";
import { indexer } from "../../db/indexer";
import { db } from "../../db";
import { getCollectionColumns } from "../../objekts/objekt-index";
import { TRPCError } from "@trpc/server";

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

    if (!result) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

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

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

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

  list: authProcedure.query(async ({ ctx: { session } }) => {
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
});

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
