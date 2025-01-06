import { ofetch } from "ofetch";
import { COSMO_ENDPOINT } from "./universal/cosmo/common";
import { OwnedObjektsResult } from "./universal/cosmo/objekts";

const RESULT_OBJEKTS_COUNT = 30;
const PARALLEL_REQUEST_COUNT = 5;

type OwnedObjektRequest = {
  address: string;
  startAfter: number;
};

const overrideColors: Record<string, string> = {
  "Divine01 SeoYeon 117Z": "#B400FF",
  "Divine01 SeoYeon 118Z": "#B400FF",
  "Divine01 SeoYeon 119Z": "#B400FF",
  "Divine01 SeoYeon 120Z": "#B400FF",
  "Divine01 SeoYeon 317Z": "#df2e37",
};

export async function fetchOwnedObjekts({
  address,
  startAfter,
}: OwnedObjektRequest) {
  const endpoint = `${COSMO_ENDPOINT}/objekt/v1/owned-by/${address}`;
  return await ofetch(endpoint, {
    query: {
      start_after: `${startAfter}`,
      sort: "newest",
    },
  })
    .then<OwnedObjektsResult>((res) => {
      return {
        ...res,
        nextStartAfter: res.nextStartAfter
          ? parseInt(res.nextStartAfter)
          : undefined,
      };
    })
    .then((res) => ({
      ...res,
      objekts: res.objekts.map((objekt) => {
        // temporary fix accent color for some collection
        const accentColor = overrideColors[objekt.collectionId];
        if (accentColor) {
          return {
            ...objekt,
            backgroundColor: accentColor,
            accentColor: accentColor,
          };
        }

        return objekt;
      }),
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
