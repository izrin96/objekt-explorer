import { fetchObjektsIndex } from "@/lib/server/objekts/objekt-index";

export async function GET() {
  const collections = await fetchObjektsIndex();
  return Response.json({
    collections,
  });
}
