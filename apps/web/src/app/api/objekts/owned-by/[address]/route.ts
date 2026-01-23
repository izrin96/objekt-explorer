import type { NextRequest } from "next/server";

import { validArtists } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { mapOwnedObjekt } from "@repo/lib/objekts";
import { and, desc, eq, inArray, lt, ne, or } from "drizzle-orm";
import * as z from "zod";

import { getSession } from "@/lib/server/auth";
import { getCollectionColumns } from "@/lib/server/objekts/objekt-index";
import { fetchUserProfiles } from "@/lib/server/profile";

type Params = {
  params: Promise<{
    address: string;
  }>;
};

const PER_PAGE = 10000;

const schema = z.object({
  artist: z.enum(validArtists).array(),
  cursor: z
    .object({
      receivedAt: z.string().or(z.date()),
      id: z.string(),
    })
    .optional(),
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
    });

  if (session && isPrivate) {
    const profiles = await fetchUserProfiles(session.user.id);

    const isProfileAuthed = profiles.some(
      (a) => a.address.toLowerCase() === params.address.toLowerCase(),
    );

    if (!isProfileAuthed)
      return Response.json({
        objekts: [],
      });
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
        ...(query.cursor
          ? [
              or(
                lt(objekts.receivedAt, new Date(query.cursor.receivedAt)),
                and(
                  eq(objekts.receivedAt, new Date(query.cursor.receivedAt)),
                  lt(objekts.id, query.cursor.id),
                ),
              ),
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
        receivedAt: results[PER_PAGE - 1].objekt.receivedAt,
        id: results[PER_PAGE - 1].objekt.id,
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
    cursor: params.get("cursor") ? JSON.parse(params.get("cursor")!) : undefined,
  });

  return result.success
    ? result.data
    : {
        artist: [],
      };
}
