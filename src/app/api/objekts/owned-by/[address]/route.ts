import { and, desc, eq, inArray, lt, ne, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod/v4";
import { getSession } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { getCollectionColumns } from "@/lib/server/objekts/objekt-index";
import { fetchUserProfiles } from "@/lib/server/profile";
import { validArtists } from "@/lib/universal/cosmo/common";
import {
  mapOwnedObjekt,
  type OwnedObjektsResult,
  ownedObjektCursorSchema,
} from "@/lib/universal/objekts";

type Params = {
  params: Promise<{
    address: string;
  }>;
};

const PER_PAGE = 10000;

const schema = z.object({
  artist: z.enum(validArtists).array(),
  cursor: ownedObjektCursorSchema,
});

export async function GET(request: NextRequest, props: Params) {
  const [session, params] = await Promise.all([getSession(), props.params]);
  const searchParams = request.nextUrl.searchParams;
  const query = parseParams(searchParams);

  const owner = await db.query.userAddress.findFirst({
    where: (q, { eq }) => eq(q.address, params.address),
    columns: {
      privateProfile: true,
    },
  });

  const isPrivate = owner?.privateProfile ?? false;

  if (!session && isPrivate)
    return Response.json({
      objekts: [],
    } satisfies OwnedObjektsResult);

  if (session && isPrivate) {
    const profiles = await fetchUserProfiles(session.user.id);

    const isProfileAuthed = profiles.some(
      (a) => a.address.toLowerCase() === params.address.toLowerCase(),
    );

    if (!isProfileAuthed)
      return Response.json({
        objekts: [],
      } satisfies OwnedObjektsResult);
  }

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
        eq(objekts.owner, params.address.toLowerCase()),
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
              or(
                lt(objekts.receivedAt, new Date(query.cursor.receivedAt)),
                and(
                  eq(objekts.receivedAt, new Date(query.cursor.receivedAt)),
                  lt(objekts.id, Number(query.cursor.id)),
                ),
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
        receivedAt: results[PER_PAGE - 1].objekt.receivedAt,
        id: results[PER_PAGE - 1].objekt.id.toString(),
      }
    : undefined;

  return Response.json({
    nextCursor,
    objekts: results.slice(0, PER_PAGE).map((a) => mapOwnedObjekt(a.objekt, a.collection)),
  } satisfies OwnedObjektsResult);
}

function parseParams(params: URLSearchParams): z.infer<typeof schema> {
  const result = schema.safeParse({
    artist: params.getAll("artist"),
    cursor: params.get("cursor") ? JSON.parse(params.get("cursor")!) : undefined,
  });

  return result.success
    ? result.data
    : {
        artist: [],
      };
}
