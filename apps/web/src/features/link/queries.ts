import { orpc } from "@/lib/orpc";

export function profileOptions(address: string, enabled: boolean) {
  return orpc.profile.find.queryOptions({ input: address, staleTime: 0, enabled });
}

/** the router-level prefix: one invalidation covers every cached profile read */
export const PROFILE_QUERY_KEY = orpc.profile.key();
