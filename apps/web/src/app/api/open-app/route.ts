import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const artist = (searchParams.get("artist") as string) ?? "";
  const to = (searchParams.get("to") as string) ?? "";
  return Response.redirect(`cosmo://${artist}/${to}`);
}
