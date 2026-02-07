import type { NextRequest } from "next/server";

import { validArtists } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { mapOwnedObjekt } from "@repo/lib/server/objekt";
import { fetchUserProfiles } from "@repo/lib/server/user";
import { isValid, parseISO } from "date-fns";
import { and, desc, eq, getColumns, inArray, lte, ne, or, sql } from "drizzle-orm";
import * as z from "zod";

import { getSession } from "@/lib/server/auth";
import { getCollectionColumns } from "@/lib/server/objekt";

type Params = {
  params: Promise<{
    address: string;
  }>;
};

const PER_PAGE = 10000;

const schema = z.object({
  artist: z.enum(validArtists).array(),
  at: z.string().optional(),
  cursor: z
    .object({
      receivedAt: z.string().or(z.date()),
      id: z.string(),
    })
    .optional(),
});

export async function GET(request: NextRequest, props: Params) {
  const [session, params] = await Promise.all([getSession(), props.params]);
  const addr = params.address.toLowerCase();
  const searchParams = request.nextUrl.searchParams;
  const query = parseParams(searchParams);

  const owner = await db.query.userAddress.findFirst({
    where: { address: addr },
    columns: {
      privateProfile: true,
    },
  });

  const isPrivate = owner?.privateProfile ?? false;

  if (!session && isPrivate)
    return Response.json({
      objekts: [],
    });

  if (session && isPrivate) {
    const profiles = await fetchUserProfiles(session.user.id);

    const isProfileAuthed = profiles.some((a) => a.address.toLowerCase() === addr);

    if (!isProfileAuthed)
      return Response.json({
        objekts: [],
      });
  }

  // snapshot
  if (query.at) {
    const targetTimestamp = parseISO(query.at);
    if (!isValid(targetTimestamp)) return Response.json({ objekts: [] });

    const latest = indexer.$with("latest").as(
      indexer
        .selectDistinctOn([transfers.objektId], {
          objektId: transfers.objektId,
          to: transfers.to,
          timestamp: transfers.timestamp,
        })
        .from(transfers)
        .where(
          and(
            lte(transfers.timestamp, targetTimestamp),
            or(eq(transfers.from, addr), eq(transfers.to, addr)),
          ),
        )
        .orderBy(transfers.objektId, desc(transfers.timestamp)),
    );

    const results = await indexer
      .with(latest)
      .select({
        objekt: {
          ...getColumns(objekts),
          receivedAt: latest.timestamp,
        },
        collection: {
          ...getCollectionColumns(),
        },
      })
      .from(latest)
      .innerJoin(objekts, eq(latest.objektId, objekts.id))
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(
        and(
          eq(latest.to, addr),
          ne(collections.slug, "empty-collection"),
          ...(query.artist.length
            ? [
                inArray(
                  collections.artist,
                  query.artist.map((a) => a.toLowerCase()),
                ),
              ]
            : []),
          ...(query.cursor
            ? [
                sql`(${latest.timestamp}, ${objekts.id}) < (${new Date(query.cursor.receivedAt)}, ${query.cursor.id})`,
              ]
            : []),
        ),
      )
      .orderBy(desc(latest.timestamp), desc(objekts.id))
      .limit(PER_PAGE + 1);

    const hasNext = results.length > PER_PAGE;
    const nextCursor = hasNext
      ? {
          receivedAt: results[PER_PAGE - 1]!.objekt.receivedAt,
          id: results[PER_PAGE - 1]!.objekt.id,
        }
      : undefined;

    return Response.json({
      nextCursor,
      objekts: results.slice(0, PER_PAGE).map((a) => mapOwnedObjekt(a.objekt, a.collection)),
    });
  }

  // current owner
  const results = await indexer
    .select({
      objekt: objekts,
      collection: {
        ...getCollectionColumns(),
      },
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(objekts.owner, addr),
        ...(query.cursor
          ? [
              sql`(${objekts.receivedAt}, ${objekts.id}) < (${new Date(query.cursor.receivedAt)}, ${query.cursor.id})`,
            ]
          : []),
        ...(query.artist.length
          ? [
              inArray(
                collections.artist,
                query.artist.map((a) => a.toLowerCase()),
              ),
            ]
          : []),
        ne(collections.slug, "empty-collection"),
      ),
    )
    .orderBy(desc(objekts.receivedAt), desc(objekts.id))
    .limit(PER_PAGE + 1);

  const hasNext = results.length > PER_PAGE;
  const nextCursor = hasNext
    ? {
        receivedAt: results[PER_PAGE - 1]!.objekt.receivedAt,
        id: results[PER_PAGE - 1]!.objekt.id,
      }
    : undefined;

  return Response.json({
    nextCursor,
    objekts: results.slice(0, PER_PAGE).map((a) => mapOwnedObjekt(a.objekt, a.collection)),
  });
}

function parseParams(params: URLSearchParams): z.infer<typeof schema> {
  const result = schema.safeParse({
    artist: params.getAll("artist"),
    at: params.get("at") ?? undefined,
    cursor: params.get("cursor") ? JSON.parse(params.get("cursor")!) : undefined,
  });

  return result.success
    ? result.data
    : {
        artist: [],
      };
}
