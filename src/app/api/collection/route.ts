import { fetchObjektsIndex } from "@/lib/server/objekts/objekt-index";
import { cacheHeaders } from "../common";

const options = {
  headers: cacheHeaders(),
};

export async function GET() {
  const collections = await fetchObjektsIndex();

  return Response.json(
    {
      collections,
    },
    options
  );
}
