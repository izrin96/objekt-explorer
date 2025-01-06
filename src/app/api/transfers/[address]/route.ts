import { NextRequest } from "next/server";
import { asc, desc, or, sql, eq } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  collections,
  transfers,
  objekts,
} from "@/lib/server/db/indexer/schema";
import { indexer } from "@/lib/server/db/indexer";

const PER_PAGE = 30;

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ address: string }> }
) {
  const params = await props.params;
  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "0");

  const results = await indexer
    .select({
      count: sql<number>`count(*) OVER() AS count`,
      transfer: transfers,
      serial: objekts.serial,
      collection: collections,
    })
    .from(transfers)
    .where(
      or(
        eq(transfers.from, params.address.toLowerCase()),
        eq(transfers.to, params.address.toLowerCase())
      )
    )
    .leftJoin(objekts, eq(transfers.objektId, objekts.id))
    .leftJoin(collections, eq(transfers.collectionId, collections.id))
    .orderBy(desc(transfers.timestamp), asc(transfers.id))
    .limit(PER_PAGE)
    .offset(page * PER_PAGE);

  const addresses = results.flatMap((r) => [r.transfer.from, r.transfer.to]);

  const knownAddresses = await db.query.userAddress.findMany({
    where: (userAddress, { inArray }) =>
      inArray(userAddress.address, addresses),
  });

  const count = results.length > 0 ? results[0].count : 0;
  const hasNext = count > (page + 1) * PER_PAGE;

  return Response.json({
    results: results.map((row) => ({
      ...row,
      fromNickname: knownAddresses.find(
        (a) => row.transfer.from.toLowerCase() === a.address.toLowerCase()
      )?.nickname,
      toNickname: knownAddresses.find(
        (a) => row.transfer.to.toLowerCase() === a.address.toLowerCase()
      )?.nickname,
    })),
    count,
    hasNext,
    nextStartAfter: hasNext ? page + 1 : undefined,
  });
}
