import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const listRulesOptions = (slug: string) =>
  orpc.list.rules.queryOptions({ input: { slug }, staleTime: 30_000 });

export function useListRules(slug: string, listType: string) {
  return useQuery({ ...listRulesOptions(slug), enabled: listType === "want" });
}

export const ruleObjektsOptions = (slug: string, ruleId: number) =>
  orpc.list.ruleObjekts.infiniteOptions({
    input: (cursor: number) => ({ slug, ruleId, cursor }),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextCursor,
    // a refetch replays every loaded page, each counted by the endpoint's per-IP limit, so
    // nothing refetches on its own and the pages go once the rule closes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 0,
  });

/** Every read a rule change moves: the strip, its objekts, and the trade counts. */
export const RULE_KEYS = [orpc.list.rules.key(), orpc.list.ruleObjekts.key(), orpc.trade.key()];
