import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { refuse } from "../lib/refuse";
import { authed, pub } from "../orpc";
import { documented, errorResponses } from "../schemas/common/documented";
import {
  addRuleInputSchema,
  listRulesInputSchema,
  listRulesOutputSchema,
  previewRuleInputSchema,
  ruleIdInputSchema,
  ruleObjektsOutputSchema,
  updateRuleInputSchema,
} from "../schemas/list-rule";
import { findOwnedList } from "../services/list";
import {
  addRule,
  deleteRule,
  detachRule,
  fetchListRules,
  previewRule,
  ruleObjekts,
  updateRule,
} from "../services/list-rules";
import { ipRateLimited, refuseOverUserLimit } from "../services/redis";

/** Each rule save reads the indexer and writes an entry for every collection the rule wants. */
const limitRuleWrites = (userId: string) => refuseOverUserLimit("list-rule", userId, 60, 3600);

async function findList(slug: string) {
  const list = await db.query.lists.findFirst({ where: { slug } });
  if (!list) throw new ORPCError("NOT_FOUND");
  return list;
}

export const listRulesRouter = {
  /** A want list's rules with how many objekts each wants now; anyone who can open the list. */
  rules: pub
    .route({
      method: "GET",
      path: "/lists/{slug}/rules",
      tags: ["Lists"],
      summary: "A want list's rules, with how many objekts each covers and wants",
      spec: errorResponses(400, 404),
    })
    .input(listRulesInputSchema)
    .output(documented(listRulesOutputSchema))
    .handler(async ({ input: { slug } }) => {
      const list = await findList(slug);
      return fetchListRules(list);
    }),

  // the rule dialog asks again on each change of the draft, so this budget is per minute
  previewRule: authed
    .input(previewRuleInputSchema)
    .handler(async ({ input: { rule }, context: { session } }) => {
      await refuseOverUserLimit("list-rule-preview", session.user.id, 120, 60);
      return previewRule(rule, session.user.id);
    }),

  addRule: authed
    .input(addRuleInputSchema)
    .handler(async ({ input: { slug, rule }, context: { session } }) => {
      await limitRuleWrites(session.user.id);
      const list = await findOwnedList(slug, session.user.id);
      return addRule(list, rule, session.user.id);
    }),

  updateRule: authed
    .input(updateRuleInputSchema)
    .handler(async ({ input: { slug, ruleId, rule }, context: { session } }) => {
      await limitRuleWrites(session.user.id);
      const list = await findOwnedList(slug, session.user.id);
      await updateRule(list, ruleId, rule, session.user.id);
    }),

  deleteRule: authed
    .input(ruleIdInputSchema)
    .handler(async ({ input: { slug, ruleId }, context: { session } }) => {
      const list = await findOwnedList(slug, session.user.id);
      await deleteRule(list, ruleId);
    }),

  /** Turn into objekts. */
  detachRule: authed
    .input(ruleIdInputSchema)
    .handler(async ({ input: { slug, ruleId }, context: { session } }) => {
      const list = await findOwnedList(slug, session.user.id);
      await detachRule(list, ruleId);
    }),

  /** See the objekts; held flags are the list owner's, public as every holding is. */
  ruleObjekts: pub
    .route({
      method: "GET",
      path: "/lists/{slug}/rules/{ruleId}/objekts",
      tags: ["Lists"],
      summary:
        "Every collection one rule covers, with whether the owner holds it and the rule wants it",
      spec: errorResponses(400, 404),
    })
    .input(ruleIdInputSchema)
    .output(documented(ruleObjektsOutputSchema))
    .handler(async ({ input: { slug, ruleId }, context }) => {
      if (await ipRateLimited("rule-objekts", context.headers ?? getRequestHeaders(), 60, 60)) {
        refuse("TOO_MANY_REQUESTS", "user_rate_limit", "Too many requests, try again shortly");
      }
      const list = await findList(slug);
      return ruleObjekts(list, ruleId);
    }),
};
