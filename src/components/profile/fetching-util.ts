import { ofetch } from "ofetch";
import { OwnedObjekt } from "@/lib/universal/objekts";
import { getBaseURL, overrideColor } from "@/lib/utils";

type OwnedObjektRequest = {
  address: string;
};

type OwnedObjektsResult = {
  objekts: OwnedObjekt[];
};

export async function fetchOwnedObjekts({ address }: OwnedObjektRequest) {
  const url = new URL(`/api/objekts/owned-by/${address}`, getBaseURL());
  return await ofetch<OwnedObjektsResult>(url.toString()).then((res) => ({
    ...res,
    objekts: res.objekts.map((objekt) => ({
      ...objekt,
      ...overrideColor(objekt),
    })),
  }));
}
