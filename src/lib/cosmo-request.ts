import { ofetch } from "ofetch";
import { OwnedObjektsResult } from "./universal/cosmo/objekts";
import { overrideColor } from "./utils";

const RESULT_OBJEKTS_COUNT = 30;
const PARALLEL_REQUEST_COUNT = 5;

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

export async function fetchOwnedObjektsParallel({
  address,
  startAfter,
}: OwnedObjektRequest) {
  const results = await Promise.all(
    Array.from({ length: PARALLEL_REQUEST_COUNT }).map((_, i) =>
      fetchOwnedObjekts({
        address: address,
        startAfter: startAfter + RESULT_OBJEKTS_COUNT * i,
      })
    )
  );

  return {
    ...results[results.length - 1],
    objekts: results.flatMap((result) => result.objekts),
  } satisfies OwnedObjektsResult;
}
