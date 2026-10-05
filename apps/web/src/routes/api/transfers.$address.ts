import { type TransfersQuery, transfersQuerySchema } from "@repo/api/schemas/transfers";
import { fetchAddressTransfers } from "@repo/api/services/transfers";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/transfers/$address")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const parsed = parseParams(url.searchParams);
        if (!parsed.ok) return parsed.response;

        return Response.json(await fetchAddressTransfers(params.address, parsed.data));
      },
    },
  },
});

function parseParams(
  params: URLSearchParams,
): { ok: true; data: TransfersQuery } | { ok: false; response: Response } {
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

  const result = transfersQuerySchema.safeParse({
    type: params.get("type") ?? "all",
    artist: params.getAll("artist"),
    member: params.getAll("member"),
    season: params.getAll("season"),
    class: params.getAll("class"),
    on_offline: params.getAll("on_offline"),
    collection: params.getAll("collection"),
    at: params.get("at") ?? undefined,
    cursor,
  });

  if (!result.success) {
    return {
      ok: false,
      response: Response.json({ error: "Invalid query parameters" }, { status: 400 }),
    };
  }

  return { ok: true, data: result.data };
}
