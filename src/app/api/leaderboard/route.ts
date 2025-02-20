import { indexer } from "@/lib/server/db/indexer";
import { and, count, eq, desc, not, inArray, sql } from "drizzle-orm";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { z } from "zod";
import {
  validArtists,
  validOnlineTypes,
  validSeasons,
} from "@/lib/universal/cosmo/common";
import { after, NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { userAddress } from "@/lib/server/db/schema";
import { redis } from "@/lib/redis-client";
import { cacheHeaders } from "../common";

const schema = z.object({
  artist: z.enum(validArtists).nullable().optional(),
  member: z.string().nullable().optional(),
  onlineType: z.enum(validOnlineTypes).nullable().optional(),
  season: z.enum(validSeasons).nullable().optional(),
});

function filters(options: z.infer<typeof schema>) {
  return [
    not(inArray(collections.class, ["Welcome", "Zero"])),
    ...(options.artist ? [eq(collections.artist, options.artist)] : []),
    ...(options.member ? [eq(collections.member, options.member)] : []),
    ...(options.season ? [eq(collections.season, options.season)] : []),
    ...(options.onlineType
      ? [eq(collections.onOffline, options.onlineType)]
      : []),
  ];
}

export async function GET(request: NextRequest) {
  const parsedParams = schema.safeParse({
    ...Object.fromEntries(request.nextUrl.searchParams.entries()),
  });

  if (!parsedParams.success)
    return Response.json(
      {
        status: "error",
        validationErrors: parsedParams.error.flatten().fieldErrors,
      },
      {
        status: 400,
      }
    );

  const options = parsedParams.data;
  const filter = filters(options);

  // get collection transferable count
  const unobtainable = await getUnobtainableSlugsCached();

  const wheres = and(
    not(inArray(collections.class, ["Welcome", "Zero"])),
    not(inArray(collections.slug, unobtainable)),
    ...filter
  );

  // get total collection
  const total = (
    await indexer
      .select({
        count: count(collections.id),
      })
      .from(collections)
      .where(wheres)
  )[0].count;

  // get leaderboard
  const subquery = indexer
    .selectDistinct({
      owner: objekts.owner,
      collectionId: objekts.collectionId,
    })
    .from(objekts)
    .leftJoin(collections, eq(objekts.collectionId, collections.id))
    .where(wheres)
    .as("subquery");

  const query = await indexer
    .select({
      owner: subquery.owner,
      count: count(subquery.collectionId),
    })
    .from(subquery)
    .groupBy(subquery.owner)
    .orderBy(desc(count(subquery.collectionId)))
    .limit(1000);

  // fetch known address
  const knownAddresses = await db
    .select()
    .from(userAddress)
    .where(
      and(
        inArray(
          userAddress.address,
          query.map((a) => a.owner)
        )
      )
    );

  // map nickname from known address
  const results = query.map((q, i) => {
    const known = knownAddresses.find(
      (a) => a.address.toLowerCase() === q.owner.toLowerCase()
    );

    return {
      count: q.count,
      address: q.owner,
      nickname: known?.nickname ?? q.owner.substring(0, 6),
    };
  });

  const response = {
    total,
    results,
  };

  // const fullPath =
  //   `${request.nextUrl.pathname}?${request.nextUrl.searchParams}`.toLowerCase();

  // after(async () => {
  //   redis.set(fullPath, JSON.stringify(null), "EX", 3600);
  // });

  return Response.json(response, {
    headers: cacheHeaders(3600),
  });
}

async function getUnobtainableSlugs() {
  const collectionTransferable = await indexer
    .select({
      slug: collections.slug,
      total: count(objekts.id),
      transferable:
        sql`count(case when transferable = true then 1 end)`.mapWith(Number),
    })
    .from(collections)
    .leftJoin(objekts, eq(collections.id, objekts.collectionId))
    .where(and(not(inArray(collections.class, ["Welcome", "Zero"]))))
    .groupBy(collections.slug);

  const unobtainable = collectionTransferable
    .map((result) => ({
      ...result,
      percentage: (result.transferable / result.total) * 100.0,
    }))
    // assume percentage less than 2 should be unobtainable
    .filter((a) => a.percentage < 2)
    .map((a) => a.slug);

  return unobtainable;
}

async function getUnobtainableSlugsCached() {
  const cached = await redis.get("unobtainable_slugs");
  if (cached) {
    return JSON.parse(cached) as string[];
  }

  const unobtainable = await getUnobtainableSlugs();

  after(async () => {
    await redis.set(
      "unobtainable_slugs",
      JSON.stringify(unobtainable),
      "EX",
      3600
    );
  });

  return unobtainable;
}
