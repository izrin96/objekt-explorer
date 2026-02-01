import { validArtists, validOnlineTypes } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { mapOwnedObjekt } from "@repo/lib/server/objekt";
import { fetchKnownAddresses } from "@repo/lib/server/user";
import { and, desc, eq, inArray, lt, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { cursorSchema } from "@/lib/server/common";
import { getCollectionColumns } from "@/lib/server/objekts/objekt-index";
import { validType } from "@/lib/universal/activity";

const PAGE_SIZE = 300;

const activitySchema = z.object({
  type: z.enum(validType).default("all"),
  artist: z.enum(validArtists).array(),
  member: z.string().array(),
  season: z.string().array(),
  class: z.string().array(),
  on_offline: z.enum(validOnlineTypes).array(),
  collection: z.string().array(),
});

type ActivityParams = z.infer<typeof activitySchema>;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = parseParams(searchParams);
  const cursor = cursorSchema.parse(
    searchParams.get("cursor") ? JSON.parse(searchParams.get("cursor")!) : undefined,
  );

  const transferResults = await indexer
    .select({
      transfer: {
        id: transfers.id,
        from: transfers.from,
        to: transfers.to,
        timestamp: transfers.timestamp,
        hash: transfers.hash,
      },
      objekt: objekts,
      collection: {
        ...getCollectionColumns(),
      },
    })
    .from(transfers)
    .innerJoin(collections, eq(transfers.collectionId, collections.id))
    .innerJoin(objekts, eq(transfers.objektId, objekts.id))
    .where(
      and(
        ...(cursor ? [lt(transfers.id, cursor.id)] : []),
        ...(query.type === "mint" ? [eq(transfers.from, Addresses.NULL)] : []),
        ...(query.type === "transfer"
          ? [and(ne(transfers.from, Addresses.NULL), ne(transfers.to, Addresses.SPIN))]
          : []),
        ...(query.type === "spin" ? [eq(transfers.to, Addresses.SPIN)] : []),
        ...(query.artist.length
          ? [
              inArray(
                collections.artist,
                query.artist.map((a) => a.toLowerCase()),
              ),
            ]
          : []),
        ...(query.member.length ? [inArray(collections.member, query.member)] : []),
        ...(query.season.length ? [inArray(collections.season, query.season)] : []),
        ...(query.class.length ? [inArray(collections.class, query.class)] : []),
        ...(query.on_offline.length ? [inArray(collections.onOffline, query.on_offline)] : []),
        ...(query.collection.length ? [inArray(collections.collectionNo, query.collection)] : []),
        ne(collections.slug, "empty-collection"),
      ),
    )
    .orderBy(desc(transfers.id))
    .limit(PAGE_SIZE + 1);

  const slicedResults = transferResults.slice(0, PAGE_SIZE);

  const addresses = slicedResults.flatMap((r) => [r.transfer.from, r.transfer.to]);

  const addressesUnique = Array.from(new Set(addresses));

  const knownAddresses = await fetchKnownAddresses(addressesUnique);

  const items = slicedResults.map((t) => {
    const from = knownAddresses.find(
      (a) => a.address.toLowerCase() === t.transfer.from.toLowerCase(),
    );
    const to = knownAddresses.find((a) => a.address.toLowerCase() === t.transfer.to.toLowerCase());

    return {
      nickname: {
        from: from?.hideNickname ? undefined : from?.nickname,
        to: to?.hideNickname ? undefined : to?.nickname,
      },
      transfer: t.transfer,
      objekt: mapOwnedObjekt(t.objekt, t.collection),
    };
  });

  const hasNextPage = transferResults.length > PAGE_SIZE;
  const nextCursor = hasNextPage
    ? {
        id: transferResults[PAGE_SIZE - 1]!.transfer.id,
      }
    : undefined;

  return NextResponse.json({
    items,
    nextCursor,
  });
}

function parseParams(params: URLSearchParams): ActivityParams {
  const result = activitySchema.safeParse({
    type: params.get("type") ?? "all",
    artist: params.getAll("artist"),
    member: params.getAll("member"),
    season: params.getAll("season"),
    class: params.getAll("class"),
    on_offline: params.getAll("on_offline"),
    collection: params.getAll("collection"),
  });

  return result.success
    ? result.data
    : {
        type: "all",
        artist: [],
        member: [],
        season: [],
        class: [],
        on_offline: [],
        collection: [],
      };
}
