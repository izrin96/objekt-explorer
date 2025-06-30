import { and, desc, eq, inArray, lt, ne, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts, transfers } from "@/lib/server/db/indexer/schema";
import { getCollectionColumns } from "@/lib/server/objekts/objekt-index";
import { type ActivityParams, activitySchema } from "@/lib/universal/activity";
import { mapOwnedObjekt } from "@/lib/universal/objekts";
import { NULL_ADDRESS, SPIN_ADDRESS } from "@/lib/utils";

const PAGE_SIZE = 300;

const cursorSchema = z
  .object({
    timestamp: z.string(),
    id: z.string(),
  })
  .optional();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = parseParams(searchParams);
  const cursor = cursorSchema.parse(
    searchParams.get("cursor") ? JSON.parse(searchParams.get("cursor")!) : undefined,
  );

  const transfersQuery = indexer
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
        ...(cursor
          ? [
              or(
                lt(transfers.timestamp, cursor.timestamp),
                and(eq(transfers.timestamp, cursor.timestamp), lt(transfers.id, cursor.id)),
              ),
            ]
          : []),
        ...(query.type === "mint" ? [eq(transfers.from, NULL_ADDRESS)] : []),
        ...(query.type === "transfer"
          ? [and(ne(transfers.from, NULL_ADDRESS), ne(transfers.to, SPIN_ADDRESS))]
          : []),
        ...(query.type === "spin" ? [eq(transfers.to, SPIN_ADDRESS)] : []),
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
      ),
    )
    .orderBy(desc(transfers.timestamp), desc(transfers.id))
    .limit(PAGE_SIZE + 1);

  const transferResults = await transfersQuery;

  const slicedResults = transferResults.slice(0, PAGE_SIZE);

  const addresses = slicedResults.flatMap((r) => [r.transfer.from, r.transfer.to]);

  const addressesUnique = Array.from(new Set(addresses));

  const knownAddresses = await db.query.userAddress.findMany({
    where: (userAddress, { inArray }) => inArray(userAddress.address, addressesUnique),
    columns: {
      address: true,
      nickname: true,
      hideActivity: true,
    },
  });

  const items = slicedResults
    .map((t) => {
      const from = knownAddresses.find(
        (a) => a.address.toLowerCase() === t.transfer.from.toLowerCase(),
      );
      const to = knownAddresses.find(
        (a) => a.address.toLowerCase() === t.transfer.to.toLowerCase(),
      );

      if (from?.hideActivity === true || to?.hideActivity === true) return null;

      return {
        user: {
          from: from ? { address: from.address, nickname: from.nickname } : undefined,
          to: to ? { address: to.address, nickname: to.nickname } : undefined,
        },
        transfer: t.transfer,
        objekt: mapOwnedObjekt(t.objekt, t.collection),
      };
    })
    .filter((t) => t !== null);

  const hasNextPage = transferResults.length > PAGE_SIZE;
  const nextCursor = hasNextPage
    ? {
        timestamp: transferResults[PAGE_SIZE - 1].transfer.timestamp,
        id: transferResults[PAGE_SIZE - 1].transfer.id,
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
      };
}
