import { ownedByFiltersSchema, type OwnedByFilters } from "@repo/api/schemas/objekts";
import { fetchOwnedObjekts, isCheckpointUnavailable } from "@repo/api/services/owned";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/objekts/owned-by/$address")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const parsed = parseParams(url.searchParams);
        if (!parsed.ok) return parsed.response;
        const query = parsed.data;

        if (isCheckpointUnavailable(params.address, query)) {
          return Response.json(
            { error: "Checkpoint is unavailable for COSMO Spin" },
            { status: 400 },
          );
        }

        return Response.json(await fetchOwnedObjekts(params.address, query));
      },
    },
  },
});

function parseParams(
  params: URLSearchParams,
): { ok: true; data: OwnedByFilters } | { ok: false; response: Response } {
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

  const result = ownedByFiltersSchema.safeParse({
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
