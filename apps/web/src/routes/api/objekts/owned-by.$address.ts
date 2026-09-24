import { ownedBySchema, type OwnedBySchema } from "@repo/api/schemas/owned-by";
import { getCollectionColumns } from "@repo/api/services/objekt";
import { isAddressHiddenFromCaller } from "@repo/api/services/privacy";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { mapOwnedObjekt } from "@repo/lib/server/objekt";
import { createFileRoute } from "@tanstack/react-router";
import { and, count, desc, eq, getColumns, inArray, lt, lte, ne, or } from "drizzle-orm";

const PER_PAGE = 8000;
const ENABLE_COUNT = false;

function buildCollectionFilters(query: OwnedBySchema) {
  if (!query.artist?.length) return [];
  return [
    inArray(
      collections.artist,
      query.artist.map((a) => a.toLowerCase()),
    ),
  ];
}

function cursorWhere(query: OwnedBySchema) {
  if (!query.cursor) return undefined;
  return or(
    lt(objekts.receivedAt, query.cursor.receivedAt),
    and(eq(objekts.receivedAt, query.cursor.receivedAt), lt(objekts.id, query.cursor.id)),
  );
}

function cursorAfter(lastResult: { objekt: { receivedAt: Date | string; id: string } }) {
  return {
    receivedAt: new Date(lastResult.objekt.receivedAt).toISOString(),
    id: lastResult.objekt.id,
  };
}

const ORDER_BY = [desc(objekts.receivedAt), desc(objekts.id)];

export const Route = createFileRoute("/api/objekts/owned-by/$address")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const addr = params.address.toLowerCase();
        const url = new URL(request.url);
        const parsed = parseParams(url.searchParams);
        if (!parsed.ok) return parsed.response;
        const query = parsed.data;

        // Spin's past state means replaying millions of transfers, so it has no checkpoint
        if (query.at && addr === Addresses.SPIN) {
          return Response.json(
            { error: "Checkpoint is unavailable for COSMO Spin" },
            { status: 400 },
          );
        }

        if (await isAddressHiddenFromCaller(addr)) {
          return Response.json({ objekts: [] });
        }

        const collectionFilters = buildCollectionFilters(query);
        const isFirstPage = !query.cursor;

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
                cursorWhere(query),
              ),
            )
            .orderBy(...ORDER_BY)
            .limit(PER_PAGE + 1);

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
                    ),
                  )
              : null;

          const [results, countResult] = await Promise.all([mainQuery, countQuery]);

          const hasNext = results.length > PER_PAGE;
          const nextCursor = hasNext ? cursorAfter(results[PER_PAGE - 1]!) : undefined;
          const total = countResult ? (countResult[0]?.count ?? 0) : undefined;

          return Response.json({
            nextCursor,
            objekts: results.slice(0, PER_PAGE).map((a) => mapOwnedObjekt(a.objekt, a.collection)),
            total,
          });
        }

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
              cursorWhere(query),
            ),
          )
          .orderBy(...ORDER_BY)
          .limit(PER_PAGE + 1);

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
                  ),
                )
            : null;

        const [results, countResult] = await Promise.all([mainQuery, countQuery]);
        const total = countResult ? (countResult[0]?.count ?? 0) : undefined;

        const hasNext = results.length > PER_PAGE;
        const nextCursor = hasNext ? cursorAfter(results[PER_PAGE - 1]!) : undefined;

        return Response.json({
          nextCursor,
          objekts: results.slice(0, PER_PAGE).map((a) => mapOwnedObjekt(a.objekt, a.collection)),
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

  const result = ownedBySchema.safeParse({
    at: params.get("at") ?? undefined,
    cursor,
    artist: params.getAll("artist").length ? params.getAll("artist") : undefined,
  });

  if (!result.success) {
    return {
      ok: false,
      response: Response.json({ error: "Invalid query parameters" }, { status: 400 }),
    };
  }

  return { ok: true, data: result.data };
}
