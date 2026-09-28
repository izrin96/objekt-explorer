import { orpc } from "@/lib/orpc";

export function profileOptions(address: string, enabled: boolean) {
  return orpc.profile.find.queryOptions({ input: address, staleTime: 0, enabled });
}

/** the router-level prefix: one invalidation covers every cached profile read */
export const PROFILE_QUERY_KEY = orpc.profile.key();

export const linkedPreviewsOptions = (addresses: string[]) =>
  orpc.cosmoLink.linkedPreviews.queryOptions({
    input: { addresses },
    // hydration keeps the server's read; a link or unlink changes the key
    staleTime: 30_000,
    select: (data) => new Map(data.map((preview) => [preview.address.toLowerCase(), preview])),
  });
