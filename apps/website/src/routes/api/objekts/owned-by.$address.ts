import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { mapOwnedObjekt } from "@repo/lib/server/objekt";
import { createFileRoute } from "@tanstack/react-router";
import { and, asc, count, desc, eq, getColumns, gt, inArray, lt, lte, ne, or } from "drizzle-orm";

import { getCollectionColumns } from "@/lib/server/objekt.server";
import { isAddressHiddenFromCaller } from "@/lib/server/privacy.server";
import { ownedBySchema, type OwnedBySchema } from "@/lib/universal/owned-by";

const PER_PAGE = 8000;
const ENABLE_COUNT = false;

function buildCollectionFilters(query: OwnedBySchema) {
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

function buildObjektFilters(query: OwnedBySchema) {
  const filters = [];

  if (query.transferable !== undefined) {
    filters.push(eq(objekts.transferable, query.transferable));
  }

  return filters;
}

function getSortConfig(query: OwnedBySchema) {
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

export const Route = createFileRoute("/api/objekts/owned-by/$address")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const addr = params.address.toLowerCase();
        const url = new URL(request.url);
        const parsed = parseParams(url.searchParams);
        if (!parsed.ok) return parsed.response;
        const query = parsed.data;

        if (await isAddressHiddenFromCaller(addr)) {
          return Response.json({ objekts: [] });
        }

        const collectionFilters = buildCollectionFilters(query);
        const objektFilters = buildObjektFilters(query);
        const sortConfig = getSortConfig(query);
        const isFirstPage = !query.cursor;
        // Clamp user-supplied limit to [1, PER_PAGE] to prevent unbounded
        // queries via query string.
        const requested = query.limit ?? PER_PAGE;
        const limit = Math.min(Math.max(1, requested), PER_PAGE);

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
            ENABLE_COUNT && isFirstPage
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
          const total = countResult ? (countResult[0]?.count ?? 0) : undefined;

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
          ENABLE_COUNT && isFirstPage
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
        const total = countResult ? (countResult[0]?.count ?? 0) : undefined;

        const hasNext = results.length > limit;
        const nextCursor = hasNext ? sortConfig.nextCursor(results[limit - 1]!) : undefined;

        return Response.json({
          nextCursor,
          objekts: results.slice(0, limit).map((a) => mapOwnedObjekt(a.objekt, a.collection)),
          total,
        });
      },
    },
  },
});

function parseParams(
  params: URLSearchParams,
): { ok: true; data: OwnedBySchema } | { ok: false; response: Response } {
  let cursor: unknown = undefined;
  const cursorRaw = params.get("cursor");
  if (cursorRaw) {
    try {
      cursor = JSON.parse(cursorRaw);
    } catch {
      return {
        ok: false,
        response: Response.json({ error: "Invalid cursor" }, { status: 400 }),
      };
    }
  }

  const limitRaw = params.get("limit");
  const limitParsed = limitRaw ? Number(limitRaw) : undefined;
  if (limitRaw && (Number.isNaN(limitParsed) || !Number.isFinite(limitParsed))) {
    return {
      ok: false,
      response: Response.json({ error: "Invalid limit" }, { status: 400 }),
    };
  }

  const result = ownedBySchema.safeParse({
    at: params.get("at") ?? undefined,
    cursor,
    artist: params.getAll("artist").length ? params.getAll("artist") : undefined,
    member: params.getAll("member").length ? params.getAll("member") : undefined,
    class: params.getAll("class").length ? params.getAll("class") : undefined,
    season: params.getAll("season").length ? params.getAll("season") : undefined,
    onOffline: params.getAll("onOffline").length ? params.getAll("onOffline") : undefined,
    transferable: params.get("transferable") ?? undefined,
    collection: params.getAll("collection").length ? params.getAll("collection") : undefined,
    sort: params.get("sort") ?? undefined,
    sort_dir: params.get("sort_dir") ?? undefined,
    limit: limitParsed,
  });

  if (!result.success) {
    return {
      ok: false,
      response: Response.json({ error: "Invalid query parameters" }, { status: 400 }),
    };
  }

  return { ok: true, data: result.data };
}
