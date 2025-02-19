import { redis } from "@/lib/redis-client";
import {
  fetchObjektsIndex,
  fetchObjektsIndexCount,
} from "@/lib/server/objekts/objekt-index";
import { after } from "next/server";
import { cacheHeaders } from "../common";

const options = {
  headers: cacheHeaders(),
};

export async function GET() {
  // check collection count
  const previousCount = await redis
    .get("collections_count")
    .then((a) => (a ? parseInt(a) : 0));

  const currentCount = await fetchObjektsIndexCount();

  // return from cached if count is same
  if (previousCount === currentCount) {
    const cached = await redis.get("collections");
    if (cached) {
      return Response.json(
        {
          collections: JSON.parse(cached),
        },
        options
      );
    }
  }

  const collections = await fetchObjektsIndex();

  after(async () => {
    await redis.set("collections", JSON.stringify(collections));
    await redis.set("collections_count", collections.length);
  });

  return Response.json(
    {
      collections,
    },
    options
  );
}
