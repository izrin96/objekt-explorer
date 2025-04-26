import { ofetch } from "ofetch";
import { OwnedObjekt } from "@/lib/universal/objekts";
import { getBaseURL } from "@/lib/utils";

type OwnedObjektRequest = {
  address: string;
};

type OwnedObjektsResult = {
  nextStartAfter?: number;
  objekts: OwnedObjekt[];
};

export async function fetchOwnedObjekts({ address }: OwnedObjektRequest) {
  const url = new URL(`/api/objekts/owned-by/${address}`, getBaseURL());

  let allObjekts: OwnedObjekt[] = [];
  let hasNext = true;
  let currentPage = 0;

  // Loop until there are no more pages
  while (hasNext) {
    const result = await ofetch<OwnedObjektsResult>(url.toString(), {
      query: {
        page: currentPage,
      },
    });

    allObjekts = [...allObjekts, ...result.objekts];

    if (result.nextStartAfter !== undefined) {
      hasNext = true;
      currentPage = result.nextStartAfter;
    } else {
      break;
    }
  }

  return {
    hasNext: false,
    nextStartAfter: undefined,
    objekts: allObjekts,
  };
}
