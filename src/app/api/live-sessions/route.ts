import type { NextRequest } from "next/server";
import * as z from "zod/v4";
import { fetchLiveSessions } from "@/lib/server/cosmo/live";
import { getAccessToken } from "@/lib/server/token";

const querySchema = z.object({
  artistId: z.string(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryResult = querySchema.safeParse({
    artistId: searchParams.get("artistId"),
  });

  if (!queryResult.success) {
    return Response.json(
      { status: "error", validationErrors: z.treeifyError(queryResult.error) },
      { status: 400 },
    );
  }

  const accessToken = await getAccessToken();
  const sessions = await fetchLiveSessions(accessToken.accessToken, queryResult.data.artistId);

  return Response.json(sessions);
}
