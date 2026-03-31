import { validArtists, validOnlineTypes } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { mapOwnedObjekt } from "@repo/lib/server/objekt";
import { fetchUserProfiles } from "@repo/lib/server/user";
import { and, desc, eq, getColumns, inArray, lt, lte, ne, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import * as z from "zod";

import { getSession } from "@/lib/server/auth";
import { getCollectionColumns } from "@/lib/server/objekt";

type Params = {
  params: Promise<{
    address: string;
  }>;
};

const PER_PAGE = 8000;

const schema = z.object({
  at: z.string().optional(),
  cursor: z
    .object({
      receivedAt: z.string(),
      id: z.string(),
    })
    .optional(),
  artist: z.enum(validArtists).array().optional(),
  member: z.array(z.string()).optional(),
  class: z.array(z.string()).optional(),
  season: z.array(z.string()).optional(),
  onOffline: z.array(z.enum(validOnlineTypes)).optional(),
  transferable: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  collection: z.string().array().optional(),
});

function buildCollectionFilters(query: z.infer<typeof schema>) {
  const filters = [];

  if (query.artist?.length) {
    filters.push(
      inArray(
        collections.artist,
        query.artist.map((a) => a.toLowerCase()),
      ),
    );
  }

  if (query.member?.length) {
    filters.push(inArray(collections.member, query.member));
  }

  if (query.class?.length) {
    filters.push(inArray(collections.class, query.class));
  }

  if (query.season?.length) {
    filters.push(inArray(collections.season, query.season));
  }

  if (query.onOffline?.length) {
    filters.push(inArray(collections.onOffline, query.onOffline));
  }

  if (query.transferable !== undefined) {
    filters.push(eq(objekts.transferable, query.transferable));
  }

  if (query.collection?.length) {
    filters.push(inArray(collections.collectionNo, query.collection));
  }

  return filters;
}

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
    orderBy: {
      id: "desc",
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

  const collectionFilters = buildCollectionFilters(query);

  // snapshot
  if (query.at) {
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
            lte(transfers.timestamp, query.at),
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
        collection: getCollectionColumns(),
      })
      .from(latest)
      .innerJoin(objekts, eq(latest.objektId, objekts.id))
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(
        and(
          eq(latest.to, addr),
          ne(collections.slug, "empty-collection"),
          ...collectionFilters,
          ...(query.cursor
            ? [
                or(
                  lt(latest.timestamp, query.cursor.receivedAt),
                  and(
                    eq(latest.timestamp, query.cursor.receivedAt),
                    lt(objekts.id, query.cursor.id),
                  ),
                ),
              ]
            : []),
        ),
      )
      .orderBy(desc(latest.timestamp), desc(objekts.id))
      .limit(PER_PAGE + 1);

    const hasNext = results.length > PER_PAGE;
    const nextCursor = hasNext
      ? {
          receivedAt: new Date(results[PER_PAGE - 1]!.objekt.receivedAt).toISOString(),
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
      collection: getCollectionColumns(),
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(objekts.owner, addr),
        ne(collections.slug, "empty-collection"),
        ...collectionFilters,
        ...(query.cursor
          ? [
              or(
                lt(objekts.receivedAt, query.cursor.receivedAt),
                and(
                  eq(objekts.receivedAt, query.cursor.receivedAt),
                  lt(objekts.id, query.cursor.id),
                ),
              ),
            ]
          : []),
      ),
    )
    .orderBy(desc(objekts.receivedAt), desc(objekts.id))
    .limit(PER_PAGE + 1);

  const hasNext = results.length > PER_PAGE;
  const nextCursor = hasNext
    ? {
        receivedAt: new Date(results[PER_PAGE - 1]!.objekt.receivedAt).toISOString(),
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
    at: params.get("at") ?? undefined,
    cursor: params.get("cursor") ? JSON.parse(params.get("cursor")!) : undefined,
    artist: params.getAll("artist").length ? params.getAll("artist") : undefined,
    member: params.getAll("member").length ? params.getAll("member") : undefined,
    class: params.getAll("class").length ? params.getAll("class") : undefined,
    season: params.getAll("season").length ? params.getAll("season") : undefined,
    onOffline: params.getAll("onOffline").length ? params.getAll("onOffline") : undefined,
    transferable: params.get("transferable") ?? undefined,
    collection: params.getAll("collection").length ? params.getAll("collection") : undefined,
  });

  return result.success ? result.data : {};
}
