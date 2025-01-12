import { NextRequest } from "next/server";
import { asc, desc, or, eq } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  collections,
  transfers,
  objekts,
} from "@/lib/server/db/indexer/schema";
import { indexer } from "@/lib/server/db/indexer";
import { z } from "zod";
import { overrideColor } from "@/lib/utils";

const PER_PAGE = 30;

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ address: string }> }
) {
  const params = await props.params;
  const searchParams = request.nextUrl.searchParams;
  const pageSchema = z.coerce.number().optional().default(0);
  const page = pageSchema.parse(searchParams.get("page"));

  const results = await indexer
    .select({
      transfer: transfers,
      serial: objekts.serial,
      collection: collections,
    })
    .from(transfers)
    .innerJoin(collections, eq(transfers.collectionId, collections.id))
    .leftJoin(objekts, eq(transfers.objektId, objekts.id))
    .where(
      or(
        eq(transfers.from, params.address.toLowerCase()),
        eq(transfers.to, params.address.toLowerCase())
      )
    )
    .orderBy(desc(transfers.timestamp), asc(transfers.id))
    .limit(PER_PAGE + 1)
    .offset(page * PER_PAGE);

  const addresses = results.flatMap((r) => [r.transfer.from, r.transfer.to]);

  const knownAddresses = await db.query.userAddress.findMany({
    where: (userAddress, { inArray }) =>
      inArray(userAddress.address, addresses),
  });

  const hasNext = results.length > PER_PAGE;

  return Response.json({
    results: results.map((row) => ({
      ...row,
      collection: {
        ...row.collection,
        ...overrideColor(row.collection),
      },
      fromNickname: knownAddresses.find(
        (a) => row.transfer.from.toLowerCase() === a.address.toLowerCase()
      )?.nickname,
      toNickname: knownAddresses.find(
        (a) => row.transfer.to.toLowerCase() === a.address.toLowerCase()
      )?.nickname,
    })),
    hasNext,
    nextStartAfter: hasNext ? page + 1 : undefined,
  });
}
