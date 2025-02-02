import { ofetch } from "ofetch";
import { OwnedObjektsResult } from "@/lib/universal/objekts";
import { overrideColor } from "@/lib/utils";

type OwnedObjektRequest = {
  address: string;
};

export async function fetchOwnedObjekts({ address }: OwnedObjektRequest) {
  const endpoint = `/api/objekts/owned-by/${address}`;
  return await ofetch<OwnedObjektsResult>(endpoint).then((res) => ({
    ...res,
    objekts: res.objekts.map((objekt) => ({
      ...objekt,
      ...overrideColor(objekt),
    })),
  }));
}
