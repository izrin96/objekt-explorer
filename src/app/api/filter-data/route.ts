import { NextResponse } from "next/server";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { cacheHeaders } from "../common";

export async function GET() {
  const result = await fetchFilterData();
  return NextResponse.json(result, {
    headers: cacheHeaders(60 * 60 * 12),
  });
}
