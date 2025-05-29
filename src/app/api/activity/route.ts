import { NextRequest, NextResponse } from "next/server";
import { indexer } from "@/lib/server/db/indexer";
import {
  objekts,
  transfers,
  collections,
} from "@/lib/server/db/indexer/schema";
import { desc, eq, lt, and, or } from "drizzle-orm";
import { z } from "zod/v4";
import { getCollectionColumns } from "@/lib/server/objekts/objekt-index";
import { mapOwnedObjekt } from "@/lib/universal/objekts";
import { db } from "@/lib/server/db";

const PAGE_SIZE = 300;

const cursorSchema = z
  .object({
    timestamp: z.string(),
    id: z.string(),
  })
  .optional();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cursor = cursorSchema.parse(
    searchParams.get("cursor")
      ? JSON.parse(searchParams.get("cursor")!)
      : undefined
  );

  const transfersQuery = indexer
    .select({
      transfer: {
        id: transfers.id,
        from: transfers.from,
        to: transfers.to,
        timestamp: transfers.timestamp,
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
      cursor
        ? or(
            lt(transfers.timestamp, cursor.timestamp),
            and(
              eq(transfers.timestamp, cursor.timestamp),
              lt(transfers.id, cursor.id)
            )
          )
        : undefined
    )
    .orderBy(desc(transfers.timestamp), desc(transfers.id))
    .limit(PAGE_SIZE + 1);

  const transferResults = await transfersQuery;

  const slicedResults = transferResults.slice(0, PAGE_SIZE);

  const addresses = slicedResults.flatMap((r) => [
    r.transfer.from,
    r.transfer.to,
  ]);

  const addressesUnique = Array.from(new Set(addresses));

  const knownAddresses = await db.query.userAddress.findMany({
    where: (userAddress, { inArray }) =>
      inArray(userAddress.address, addressesUnique),
    columns: {
      address: true,
      nickname: true,
      hideActivity: true,
    },
  });

  const items = slicedResults
    .map((t) => {
      const from = knownAddresses.find(
        (a) => a.address.toLowerCase() === t.transfer.from.toLowerCase()
      );
      const to = knownAddresses.find(
        (a) => a.address.toLowerCase() === t.transfer.to.toLowerCase()
      );

      return {
        user: {
          from: from !== undefined && !from.hideActivity ? from : undefined,
          to: to !== undefined && !to.hideActivity ? to : undefined,
        },
        transfer: t.transfer,
        objekt: mapOwnedObjekt(t.objekt, t.collection),
      };
    })
    .filter(
      (t) =>
        Object.values(t.user).some((a) => a?.hideActivity === true) === false
    );

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
