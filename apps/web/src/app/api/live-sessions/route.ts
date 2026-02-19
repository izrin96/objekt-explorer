import { fetchLiveSessions } from "@repo/cosmo/server/live";
import { validArtists } from "@repo/cosmo/types/common";
import type { NextRequest } from "next/server";
import * as z from "zod";

import { getAccessToken } from "@/lib/server/token";

const querySchema = z.object({
  artistId: z.enum(validArtists),
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
