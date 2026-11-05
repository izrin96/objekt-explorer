import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { toastManager } from "@/components/ui/toast";
import { RatioChip } from "@/features/list/ratio-chip";
import { RatioPicker } from "@/features/list/ratio-picker";
import { appliedRatio, type RatioSide, ratioLabel } from "@/features/list/ratio-text";
import { listRulesOptions, RULE_KEYS } from "@/features/list/rules/queries";
import { ruleInputOf } from "@/features/list/rules/rule-draft";
import { ConfirmRule } from "@/features/list/rules/rules-strip";
import { ruleText } from "@/features/list/rules/words";
import { client } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

type Rule = Awaited<ReturnType<typeof client.list.rules>>[number];

/** A want side's rules, each opening its own ratio where the side takes one, and Add rule. */
export function PreviewRules({
  slug,
  listRatio,
  ratio,
  onAddRule,
}: {
  slug: string;
  listRatio: number | null;
  ratio: RatioSide | null;
  onAddRule: () => void;
}) {
  const rulesQuery = useQuery(listRulesOptions(slug));
  const rules = rulesQuery.data;
  // kept after closing so the dialog can animate out and hand focus back to its button
  const [deleting, setDeleting] = useState<{ rule: Rule; open: boolean } | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {rulesQuery.isError ? (
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
          {m.common_error_loading_data()}
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void rulesQuery.refetch()}
          >
            {m.common_error_retry()}
          </Button>
        </p>
      ) : null}
      {rules && rules.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {rules.map((rule) => (
            <li key={rule.id} className="flex min-w-0 items-start gap-0.5">
              <RuleChip rule={rule} slug={slug} listRatio={listRatio} ratio={ratio} />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive-foreground shrink-0"
                aria-label={m.trade_composer_rule_delete({ rule: ruleText(rule) })}
                title={m.rule_delete()}
                onClick={() => setDeleting({ rule, open: true })}
              >
                <TrashIcon />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {deleting ? (
        <ConfirmRule
          key={deleting.rule.id}
          slug={slug}
          rule={deleting.rule}
          focusAfterDone={addRef}
          action={deleting.open ? "delete" : null}
          onClose={() =>
            // a delete that finishes after another rule's dialog opened must not close that one
            setDeleting((current) =>
              current?.rule.id === deleting.rule.id ? { ...current, open: false } : current,
            )
          }
        />
      ) : null}
      <Button
        ref={addRef}
        type="button"
        variant="outline"
        size="xs"
        className="w-fit"
        onClick={onAddRule}
      >
        <PlusIcon />
        {m.rule_add()}
      </Button>
    </div>
  );
}

const RULE_BOX =
  "flex max-w-64 min-w-0 items-start gap-1.5 rounded-lg border px-2 py-1 text-start text-xs";

function RuleChip({
  rule,
  slug,
  listRatio,
  ratio,
}: {
  rule: Rule;
  slug: string;
  listRatio: number | null;
  ratio: RatioSide | null;
}) {
  const [open, setOpen] = useState(false);
  const applied = ratio ? appliedRatio(rule.ratio, listRatio) : null;
  const text = ruleText(rule);
  const face = (
    <>
      <Badge variant="outline" size="sm" className="shrink-0 tracking-wide">
        {m.trade_rule_tag()}
      </Badge>
      <span className="min-w-0 flex-1 text-pretty">{text}</span>
      {applied && ratio ? (
        <RatioChip
          ratio={applied.ratio}
          side={ratio}
          owner
          inherited={applied.inherited}
          className="shrink-0"
        />
      ) : null}
    </>
  );
  if (!ratio) return <div className={RULE_BOX}>{face}</div>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          RULE_BOX,
          "hover:bg-accent/50 focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2",
        )}
        aria-label={
          applied
            ? m.trade_composer_rule_ratio_set({
                rule: text,
                ratio: ratioLabel(applied.ratio, ratio, {
                  owner: true,
                  inherited: applied.inherited,
                }),
              })
            : m.trade_composer_rule_ratio({ rule: text })
        }
      >
        {face}
      </PopoverTrigger>
      <PopoverPopup className="w-80">
        <PopoverTitle className="text-sm">{text}</PopoverTitle>
        <div className="mt-2">
          <RuleRatioPicker
            rule={rule}
            slug={slug}
            listRatio={listRatio}
            onDone={() => setOpen(false)}
          />
        </div>
      </PopoverPopup>
    </Popover>
  );
}

function RuleRatioPicker({
  rule,
  slug,
  listRatio,
  onDone,
}: {
  rule: Rule;
  slug: string;
  listRatio: number | null;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: async (ratio: number | null) => {
      const input = ruleInputOf(rule);
      if (!input) throw new Error("rule has no definition to send back");
      await client.list.updateRule({ slug, ruleId: rule.id, rule: input, ratio });
    },
    onSuccess: async () => {
      onDone();
      toastManager.add({ type: "success", title: m.ratio_set_success() });
      await Promise.all(RULE_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    onError: (error) => {
      toastManager.add({
        type: "error",
        title: m.ratio_set_error(),
        description: refusalText(error),
      });
    },
  });
  return (
    <RatioPicker
      side="want"
      label={m.ratio_label()}
      description={m.rule_ratio_desc()}
      value={rule.ratio}
      listRatio={listRatio}
      disabled={save.isPending}
      onChange={(ratio) => save.mutate(ratio)}
    />
  );
}
