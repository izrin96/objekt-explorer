import { orpc } from "@/lib/orpc";

export const listRulesOptions = (slug: string) =>
  orpc.list.rules.queryOptions({ input: { slug }, staleTime: 30_000 });

export const ruleObjektsOptions = (slug: string, ruleId: number) =>
  orpc.list.ruleObjekts.queryOptions({ input: { slug, ruleId } });

/** Every read a rule change moves: the strip, its objekts, and the trade counts. */
export const RULE_KEYS = [orpc.list.rules.key(), orpc.list.ruleObjekts.key(), orpc.trade.key()];
