import { ofetch } from "ofetch";
import { OwnedObjektsResult } from "./universal/objekts";
import { overrideColor } from "./utils";

type OwnedObjektRequest = {
  address: string;
  page: number;
};

export async function fetchOwnedObjekts({ address, page }: OwnedObjektRequest) {
  const endpoint = `/api/objekts/owned-by/${address}`;
  return await ofetch<OwnedObjektsResult>(endpoint, {
    query: {
      page: `${page}`,
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
