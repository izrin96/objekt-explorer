import { NextResponse } from "next/server";

import { fetchFilterData } from "@/lib/server/objekts/filter-data";

export async function GET() {
  const result = await fetchFilterData();
  return NextResponse.json(result);
}
