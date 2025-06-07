import { NextRequest } from "next/server";
import { desc, or, eq, and, inArray, ne, lt } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  collections,
  transfers,
  objekts,
} from "@/lib/server/db/indexer/schema";
import { indexer } from "@/lib/server/db/indexer";
import {
  TransferParams,
  TransferResult,
  transfersSchema,
} from "@/lib/universal/transfers";
import { mapOwnedObjekt } from "@/lib/universal/objekts";
import { NULL_ADDRESS, SPIN_ADDRESS } from "@/lib/utils";
import { cachedSession } from "@/lib/server/auth";
import { fetchUserProfiles } from "@/lib/server/profile";
import { getCollectionColumns } from "@/lib/server/objekts/objekt-index";
import { z } from "zod/v4";

const PER_PAGE = 150;

const cursorSchema = z
  .object({
    timestamp: z.string(),
    id: z.string(),
  })
  .optional();

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ address: string }> }
) {
  const params = await props.params;
  const searchParams = request.nextUrl.searchParams;
  const query = parseParams(searchParams);
  const cursor = cursorSchema.parse(
    searchParams.get("cursor")
      ? JSON.parse(searchParams.get("cursor")!)
      : undefined
  );

  const session = await cachedSession();

  const owner = await db.query.userAddress.findFirst({
    where: (q, { eq }) => eq(q.address, params.address),
    columns: {
      privateProfile: true,
    },
  });

  const isPrivate = owner?.privateProfile ?? false;

  if (!session && isPrivate)
    return Response.json({
      hide: true,
      results: [],
    } satisfies TransferResult);

  if (session && isPrivate) {
    const profiles = await fetchUserProfiles(session.user.id);

    const isProfileAuthed = profiles.some(
      (a) => a.address.toLowerCase() === params.address.toLowerCase()
    );

    if (!isProfileAuthed)
      return Response.json({
        hide: true,
        results: [],
      } satisfies TransferResult);
  }

  const results = await indexer
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
      and(
        ...(cursor
          ? [
              or(
                lt(transfers.timestamp, cursor.timestamp),
                and(
                  eq(transfers.timestamp, cursor.timestamp),
                  lt(transfers.id, cursor.id)
                )
              ),
            ]
          : []),
        ...(query.type === "all"
          ? [
              or(
                eq(transfers.from, params.address.toLowerCase()),
                eq(transfers.to, params.address.toLowerCase())
              ),
            ]
          : []),
        ...(query.type === "mint"
          ? [
              and(
                eq(transfers.from, NULL_ADDRESS),
                eq(transfers.to, params.address.toLowerCase())
              ),
            ]
          : []),
        ...(query.type === "received"
          ? [
              and(
                ne(transfers.from, NULL_ADDRESS),
                eq(transfers.to, params.address.toLowerCase())
              ),
            ]
          : []),
        ...(query.type === "sent"
          ? [
              and(
                eq(transfers.from, params.address.toLowerCase()),
                ne(transfers.to, SPIN_ADDRESS)
              ),
            ]
          : []),
        ...(query.type === "spin"
          ? [
              and(
                eq(transfers.from, params.address.toLowerCase()),
                eq(transfers.to, SPIN_ADDRESS)
              ),
            ]
          : []),
        ...(query.artist.length
          ? [
              inArray(
                collections.artist,
                query.artist.map((a) => a.toLowerCase())
              ),
            ]
          : []),
        ...(query.member.length
          ? [inArray(collections.member, query.member)]
          : []),
        ...(query.season.length
          ? [inArray(collections.season, query.season)]
          : []),
        ...(query.class.length
          ? [inArray(collections.class, query.class)]
          : []),
        ...(query.on_offline.length
          ? [inArray(collections.onOffline, query.on_offline)]
          : [])
      )
    )
    .orderBy(desc(transfers.timestamp), desc(transfers.id))
    .limit(PER_PAGE + 1);

  const hasNext = results.length > PER_PAGE;
  const nextCursor = hasNext
    ? {
        timestamp: results[PER_PAGE - 1].transfer.timestamp,
        id: results[PER_PAGE - 1].transfer.id,
      }
    : undefined;
  const slicedResults = results.slice(0, PER_PAGE);

  const addresses = slicedResults.flatMap((r) => [
    r.transfer.from,
    r.transfer.to,
  ]);

  const addressesUnique = Array.from(new Set(addresses));

  const knownAddresses = await db.query.userAddress.findMany({
    where: (userAddress, { inArray }) =>
      inArray(userAddress.address, addressesUnique),
  });

  return Response.json({
    nextCursor,
    results: slicedResults.map((row) => ({
      transfer: row.transfer,
      objekt: mapOwnedObjekt(row.objekt, row.collection),
      nickname: {
        from: knownAddresses.find(
          (a) => row.transfer.from.toLowerCase() === a.address.toLowerCase()
        )?.nickname,
        to: knownAddresses.find(
          (a) => row.transfer.to.toLowerCase() === a.address.toLowerCase()
        )?.nickname,
      },
    })),
  } satisfies TransferResult);
}

function parseParams(params: URLSearchParams): TransferParams {
  const result = transfersSchema.safeParse({
    type: params.get("type"),
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
