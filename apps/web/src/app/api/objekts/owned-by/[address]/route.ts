import {
  validArtists,
  validCustomSorts,
  validOnlineTypes,
  validSortDirection,
} from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { mapOwnedObjekt } from "@repo/lib/server/objekt";
import { fetchUserProfiles } from "@repo/lib/server/user";
import { and, asc, count, desc, eq, getColumns, gt, inArray, lt, lte, ne, or } from "drizzle-orm";
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

// Cursor schema - flexible for different sort modes
const cursorSchema = z.object({
  receivedAt: z.string().optional(),
  serial: z.coerce.number().optional(),
  collectionNo: z.string().optional(),
  id: z.string(),
});

const schema = z.object({
  at: z.string().optional(),
  cursor: cursorSchema.optional(),
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
  sort: z.enum(validCustomSorts).optional(),
  sort_dir: z.enum(validSortDirection).optional(),
  includeCount: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  limit: z.number().optional(),
});

type Query = z.infer<typeof schema>;

function buildCollectionFilters(query: Query) {
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

  if (query.collection?.length) {
    filters.push(inArray(collections.collectionNo, query.collection));
  }

  return filters;
}

function buildObjektFilters(query: Query) {
  const filters = [];

  if (query.transferable !== undefined) {
    filters.push(eq(objekts.transferable, query.transferable));
  }

  return filters;
}

function getSortConfig(query: Query) {
  const sort = query.sort ?? "date";
  const sortDir = query.sort_dir ?? "desc";
  const isAsc = sortDir === "asc";

  switch (sort) {
    case "serial":
      return {
        orderBy: isAsc
          ? [asc(objekts.serial), asc(objekts.id)]
          : [desc(objekts.serial), desc(objekts.id)],
        cursorWhere:
          query.cursor?.serial !== undefined
            ? isAsc
              ? or(
                  gt(objekts.serial, query.cursor.serial),
                  and(eq(objekts.serial, query.cursor.serial), gt(objekts.id, query.cursor.id)),
                )
              : or(
                  lt(objekts.serial, query.cursor.serial),
                  and(eq(objekts.serial, query.cursor.serial), lt(objekts.id, query.cursor.id)),
                )
            : undefined,
        nextCursor: (lastResult: { objekt: { serial: number; id: string } }) => ({
          serial: lastResult.objekt.serial,
          id: lastResult.objekt.id,
        }),
      };

    case "collectionNo":
      return {
        orderBy: isAsc
          ? [asc(collections.collectionNo), asc(objekts.id)]
          : [desc(collections.collectionNo), desc(objekts.id)],
        cursorWhere: query.cursor?.collectionNo
          ? isAsc
            ? or(
                gt(collections.collectionNo, query.cursor.collectionNo),
                and(
                  eq(collections.collectionNo, query.cursor.collectionNo),
                  gt(objekts.id, query.cursor.id),
                ),
              )
            : or(
                lt(collections.collectionNo, query.cursor.collectionNo),
                and(
                  eq(collections.collectionNo, query.cursor.collectionNo),
                  lt(objekts.id, query.cursor.id),
                ),
              )
          : undefined,
        nextCursor: (lastResult: {
          collection: { collectionNo: string };
          objekt: { id: string };
        }) => ({
          collectionNo: lastResult.collection.collectionNo,
          id: lastResult.objekt.id,
        }),
      };

    // date (default)
    default:
      return {
        orderBy: isAsc
          ? [asc(objekts.receivedAt), asc(objekts.id)]
          : [desc(objekts.receivedAt), desc(objekts.id)],
        cursorWhere: query.cursor?.receivedAt
          ? isAsc
            ? or(
                gt(objekts.receivedAt, query.cursor.receivedAt),
                and(
                  eq(objekts.receivedAt, query.cursor.receivedAt),
                  gt(objekts.id, query.cursor.id),
                ),
              )
            : or(
                lt(objekts.receivedAt, query.cursor.receivedAt),
                and(
                  eq(objekts.receivedAt, query.cursor.receivedAt),
                  lt(objekts.id, query.cursor.id),
                ),
              )
          : undefined,
        nextCursor: (lastResult: { objekt: { receivedAt: Date | string; id: string } }) => ({
          receivedAt: new Date(lastResult.objekt.receivedAt).toISOString(),
          id: lastResult.objekt.id,
        }),
      };
  }
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
  const objektFilters = buildObjektFilters(query);
  const sortConfig = getSortConfig(query);
  const isFirstPage = !query.cursor;
  const limit = query.limit ?? PER_PAGE;

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

    const mainQuery = indexer
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
          ...objektFilters,
          sortConfig.cursorWhere,
        ),
      )
      .orderBy(...sortConfig.orderBy)
      .limit(limit + 1);

    const countQuery =
      query.includeCount && isFirstPage
        ? indexer
            .with(latest)
            .select({ count: count() })
            .from(latest)
            .innerJoin(objekts, eq(latest.objektId, objekts.id))
            .innerJoin(collections, eq(collections.id, objekts.collectionId))
            .where(
              and(
                eq(latest.to, addr),
                ne(collections.slug, "empty-collection"),
                ...collectionFilters,
                ...objektFilters,
              ),
            )
        : null;

    const [results, countResult] = await Promise.all([mainQuery, countQuery]);

    const hasNext = results.length > limit;
    const nextCursor = hasNext ? sortConfig.nextCursor(results[limit - 1]!) : undefined;
    const total = countResult ? Number(countResult[0]?.count ?? 0) : undefined;

    return Response.json({
      nextCursor,
      objekts: results.slice(0, limit).map((a) => mapOwnedObjekt(a.objekt, a.collection)),
      total,
    });
  }

  // current owner
  const mainQuery = indexer
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
        ...objektFilters,
        sortConfig.cursorWhere,
      ),
    )
    .orderBy(...sortConfig.orderBy)
    .limit(limit + 1);

  const countQuery =
    query.includeCount && isFirstPage
      ? indexer
          .select({ count: count() })
          .from(objekts)
          .innerJoin(collections, eq(objekts.collectionId, collections.id))
          .where(
            and(
              eq(objekts.owner, addr),
              ne(collections.slug, "empty-collection"),
              ...collectionFilters,
              ...objektFilters,
            ),
          )
      : null;

  const [results, countResult] = await Promise.all([mainQuery, countQuery]);
  const total = countResult ? Number(countResult[0]?.count ?? 0) : undefined;

  const hasNext = results.length > limit;
  const nextCursor = hasNext ? sortConfig.nextCursor(results[limit - 1]!) : undefined;

  return Response.json({
    nextCursor,
    objekts: results.slice(0, limit).map((a) => mapOwnedObjekt(a.objekt, a.collection)),
    total,
  });
}

function parseParams(params: URLSearchParams): Query {
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
    sort: params.get("sort") ?? undefined,
    sort_dir: params.get("sort_dir") ?? undefined,
    includeCount: params.get("includeCount") ?? undefined,
    limit: params.get("limit") ? Number(params.get("limit")) : undefined,
  });

  return result.success ? result.data : {};
}
