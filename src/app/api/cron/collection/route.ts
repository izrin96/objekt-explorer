import { fixCollection, fixObjektSerial } from "@/lib/server/objekts/objekt-fix";

export async function POST() {
  await fixObjektSerial();
  await fixCollection();
  return Response.json({
    status: "ok",
  });
}
