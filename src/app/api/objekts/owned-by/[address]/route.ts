import { cachedSession } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { objekts, collections } from "@/lib/server/db/indexer/schema";
import { getCollectionColumns } from "@/lib/server/objekts/objekt-index";
import { fetchUserProfiles } from "@/lib/server/profile";
import { mapOwnedObjekt } from "@/lib/universal/objekts";
import { eq, desc, asc, and, lt, gt, or } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod/v4";

type Params = {
  params: Promise<{
    address: string;
  }>;
};

const PER_PAGE = 10000;

const cursorSchema = z
  .object({
    receivedAt: z.string(),
    id: z.number(),
  })
  .optional();

export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;
  const searchParams = request.nextUrl.searchParams;
  const cursor = cursorSchema.parse(
    searchParams.get("cursor")
      ? JSON.parse(searchParams.get("cursor")!)
      : undefined
  );

  const session = await cachedSession();

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
      (a) => a.address.toLowerCase() === params.address.toLowerCase()
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
        cursor
          ? or(
              lt(objekts.receivedAt, cursor.receivedAt),
              and(
                eq(objekts.receivedAt, cursor.receivedAt),
                gt(objekts.id, cursor.id)
              )
            )
          : undefined
      )
    )
    .orderBy(desc(objekts.receivedAt), asc(objekts.id))
    .limit(PER_PAGE + 1);

  const hasNext = results.length > PER_PAGE;
  const nextCursor = hasNext
    ? {
        receivedAt: results[PER_PAGE - 1].objekt.receivedAt,
        id: Number(results[PER_PAGE - 1].objekt.id),
      }
    : undefined;

  return Response.json({
    nextCursor,
    objekts: results
      .slice(0, PER_PAGE)
      .map((a) => mapOwnedObjekt(a.objekt, a.collection)),
  });
}
