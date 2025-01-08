import { ofetch } from "ofetch";
import { OwnedObjektsResult } from "./universal/objekts";
import { overrideColor } from "./utils";

type OwnedObjektRequest = {
  address: string;
  startAfter: number;
};

export async function fetchOwnedObjekts({
  address,
  startAfter,
}: OwnedObjektRequest) {
  const endpoint = `/api/objekts/owned-by/${address}`;
  return await ofetch<OwnedObjektsResult>(endpoint, {
    query: {
      start_after: `${startAfter}`,
      sort: "newest",
    },
  }).then((res) => ({
    ...res,
    objekts: res.objekts.map((objekt) => ({
      ...objekt,
      ...overrideColor(objekt),
    })),
  }));
}
