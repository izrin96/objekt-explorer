import type { NextRequest } from "next/server";

import { validArtists, validOnlineTypes } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { mapOwnedObjekt } from "@repo/lib/objekts";
import { and, desc, eq, inArray, lt, ne, or } from "drizzle-orm";
import * as z from "zod";

import { getSession } from "@/lib/server/auth";
import { cursorSchema } from "@/lib/server/common";
import { getCollectionColumns } from "@/lib/server/objekts/objekt-index";
import { fetchKnownAddresses, fetchUserProfiles } from "@/lib/server/profile";
import { validType } from "@/lib/universal/transfers";

const PER_PAGE = 150;

const transfersSchema = z.object({
  type: z.enum(validType).default("all"),
  artist: z.enum(validArtists).array(),
  member: z.string().array(),
  season: z.string().array(),
  class: z.string().array(),
  on_offline: z.enum(validOnlineTypes).array(),
  collection: z.string().array(),
});

type TransferParams = z.infer<typeof transfersSchema>;

export async function GET(request: NextRequest, props: { params: Promise<{ address: string }> }) {
  const [session, params] = await Promise.all([getSession(), props.params]);
  const searchParams = request.nextUrl.searchParams;
  const query = parseParams(searchParams);
  const cursor = cursorSchema.parse(
    searchParams.get("cursor") ? JSON.parse(searchParams.get("cursor")!) : undefined,
  );

  const owner = await db.query.userAddress.findFirst({
    where: (q, { eq }) => eq(q.address, params.address),
    columns: {
      privateProfile: true,
      hideTransfer: true,
    },
  });

  const isPrivate = (owner?.privateProfile ?? false) || (owner?.hideTransfer ?? false);

  if (!session && isPrivate)
    return Response.json({
      hide: true,
      results: [],
    });

  if (session && isPrivate) {
    const profiles = await fetchUserProfiles(session.user.id);

    const isProfileAuthed = profiles.some(
      (a) => a.address.toLowerCase() === params.address.toLowerCase(),
    );

    if (!isProfileAuthed)
      return Response.json({
        hide: true,
        results: [],
      });
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
        ...(query.type === "all"
          ? [
              or(
                eq(transfers.from, params.address.toLowerCase()),
                eq(transfers.to, params.address.toLowerCase()),
              ),
            ]
          : []),
        ...(query.type === "mint"
          ? [
              and(
                eq(transfers.from, Addresses.NULL),
                eq(transfers.to, params.address.toLowerCase()),
              ),
            ]
          : []),
        ...(query.type === "received"
          ? [
              and(
                ne(transfers.from, Addresses.NULL),
                eq(transfers.to, params.address.toLowerCase()),
              ),
            ]
          : []),
        ...(query.type === "sent"
          ? [
              and(
                eq(transfers.from, params.address.toLowerCase()),
                ne(transfers.to, Addresses.SPIN),
              ),
            ]
          : []),
        ...(query.type === "spin"
          ? [
              and(
                eq(transfers.from, params.address.toLowerCase()),
                eq(transfers.to, Addresses.SPIN),
              ),
            ]
          : []),
        ...(cursor ? [lt(transfers.id, cursor.id)] : []),
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
    .limit(PER_PAGE + 1);

  const hasNext = results.length > PER_PAGE;
  const nextCursor = hasNext
    ? {
        id: results[PER_PAGE - 1]!.transfer.id,
      }
    : undefined;
  const slicedResults = results.slice(0, PER_PAGE);

  const addresses = slicedResults.flatMap((r) => [r.transfer.from, r.transfer.to]);

  const addressesUnique = Array.from(new Set(addresses));

  const knownAddresses = await fetchKnownAddresses(addressesUnique);

  return Response.json({
    nextCursor,
    results: slicedResults.map((row) => ({
      transfer: row.transfer,
      objekt: mapOwnedObjekt(row.objekt, row.collection),
      nickname: {
        from: knownAddresses.find(
          (a) => row.transfer.from.toLowerCase() === a.address.toLowerCase() && !a.hideNickname,
        )?.nickname,
        to: knownAddresses.find(
          (a) => row.transfer.to.toLowerCase() === a.address.toLowerCase() && !a.hideNickname,
        )?.nickname,
      },
    })),
  });
}

function parseParams(params: URLSearchParams): TransferParams {
  const result = transfersSchema.safeParse({
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
