import { redis } from "@/lib/redis-client";
import { fetchObjektsIndex } from "@/lib/server/objekts/objekt-index";
import { after } from "next/server";
import { cacheHeaders } from "../common";

const KEY = "collections";

export async function GET() {
  const cached = await redis.get(KEY);
  const options = {
    headers: cacheHeaders(),
  };
  if (cached) {
    return Response.json(
      {
        collections: JSON.parse(cached),
      },
      options
    );
  }
  const collections = await fetchObjektsIndex();
  after(async () => {
    await redis.set(KEY, JSON.stringify(collections), "EX", 30);
  });

  return Response.json(
    {
      collections,
    },
    options
  );
}
