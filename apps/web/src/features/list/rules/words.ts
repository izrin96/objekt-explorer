import { type ListRuleDef, ruleLabel } from "@repo/api/schemas/list-rule";

import { m } from "@/paraglide/messages";

/** A rule's strip label in the reader's language: `CC366 · any member`. */
export const ruleText = (rule: ListRuleDef) =>
  ruleLabel(rule, { anyMember: m.rule_word_any_member(), anySeason: m.rule_word_any_season() });

/** `117Z` → `cc117`, the way traders write a collection number on its own. */
export const shortNo = (season: string | null, collectionNo: string) =>
  `${
    season
      ? season
          .charAt(0)
          .toLowerCase()
          .repeat(Number(season.slice(-2)) || 1)
      : ""
  }${collectionNo.replace(/[A-Z]$/, "")}`;
