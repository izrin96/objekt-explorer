import { type ListRuleInput, ruleDef } from "@repo/api/schemas/list-rule";

import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { ruleText } from "./words";

/** The live line: the rule's name, its counts, and why it can't be added. */
export function RulePreview({
  input,
  counts,
  pending,
}: {
  input: ListRuleInput | null;
  counts:
    | {
        covers: number;
        owned: number;
        canMatch: number;
        problem: "nothing_to_match" | "no_collections" | null;
      }
    | undefined;
  pending: boolean;
}) {
  const label = input === null ? null : ruleText(ruleDef(input));
  return (
    <div role="status" aria-busy={pending}>
      {input === null ? (
        <p className="text-muted-foreground text-sm">{m.rule_incomplete()}</p>
      ) : (
        <div className="bg-muted/48 flex flex-col gap-1 rounded-lg border px-3 py-2.5">
          <span className="text-sm">{label}</span>
          {counts === undefined ? (
            <span className="text-muted-foreground text-xs">{m.rule_counting()}</span>
          ) : counts.problem === "no_collections" ? (
            <span className="text-destructive-foreground text-xs text-pretty">
              {m.rule_no_collections()}
            </span>
          ) : (
            <>
              <span className="text-muted-foreground text-xs tabular-nums">
                {counts.covers === 1
                  ? m.rule_preview_counts_one({ owned: counts.owned.toLocaleString(getLocale()) })
                  : m.rule_preview_counts({
                      covers: counts.covers.toLocaleString(getLocale()),
                      owned: counts.owned.toLocaleString(getLocale()),
                    })}{" "}
                ·{" "}
                <span className="text-foreground font-medium">
                  {m.rule_can_match({ count: counts.canMatch.toLocaleString(getLocale()) })}
                </span>
              </span>
              {counts.problem === "nothing_to_match" ? (
                <span className="text-destructive-foreground text-xs text-pretty">
                  {m.rule_nothing_to_match()}
                </span>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
