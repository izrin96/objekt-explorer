import {
  DotsThreeIcon,
  EyeIcon,
  ListBulletsIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { SheetDescription, SheetHeader, SheetPanel, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toastManager } from "@/components/ui/toast";
import { RatioChip } from "@/features/list/ratio-chip";
import { RatioPicker } from "@/features/list/ratio-picker";
import { appliedRatio, type RatioSide, ratioLabel } from "@/features/list/ratio-text";
import { listRulesOptions, RULE_KEYS, ruleObjektsOptions } from "@/features/list/rules/queries";
import { ruleInputOf } from "@/features/list/rules/rule-draft";
import { mergeRulePages } from "@/features/list/rules/rule-layout";
import { ConfirmRule } from "@/features/list/rules/rules-strip";
import { ruleText, shortNo } from "@/features/list/rules/words";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { PanelCardGrid } from "@/features/objekt/virtual-card-grid";
import { LoadError } from "@/features/trade/load-error";
import { client } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

export type Rule = Awaited<ReturnType<typeof client.list.rules>>[number];

/** a rule action that opens the side sheet; `from` is where focus goes back to */
type RuleSheetAction = (rule: Rule, from: HTMLElement | null) => void;

/**
 * A want side's rules, each opening its own ratio where the side takes one, and the list page's
 * rule actions in its menu; then Add rule.
 */
export function PreviewRules({
  slug,
  listRatio,
  ratio,
  onAddRule,
  onEditRule,
  onSeeObjekts,
}: {
  slug: string;
  listRatio: number | null;
  ratio: RatioSide | null;
  onAddRule: () => void;
  onEditRule: RuleSheetAction;
  onSeeObjekts: RuleSheetAction;
}) {
  const rulesQuery = useQuery(listRulesOptions(slug));
  const rules = rulesQuery.data;
  // kept after closing so the dialog can animate out and hand focus back to its button
  const [confirm, setConfirm] = useState<{
    rule: Rule;
    action: "delete" | "detach";
    open: boolean;
  } | null>(null);
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
              <RuleMenu
                rule={rule}
                onSeeObjekts={onSeeObjekts}
                onEditRule={onEditRule}
                onConfirm={(action) => setConfirm({ rule, action, open: true })}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {confirm ? (
        <ConfirmRule
          key={confirm.rule.id}
          slug={slug}
          rule={confirm.rule}
          focusAfterDone={addRef}
          action={confirm.open ? confirm.action : null}
          onClose={() =>
            // a delete that finishes after another rule's dialog opened must not close that one
            setConfirm((current) =>
              current?.rule.id === confirm.rule.id ? { ...current, open: false } : current,
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

/** The list page's rule menu: See objekts, Edit rule, Turn into objekts, then Delete. */
function RuleMenu({
  rule,
  onSeeObjekts,
  onEditRule,
  onConfirm,
}: {
  rule: Rule;
  onSeeObjekts: RuleSheetAction;
  onEditRule: RuleSheetAction;
  onConfirm: (action: "delete" | "detach") => void;
}) {
  // the menu item is gone once the sheet opens, so the sheet hands focus back to the trigger
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Menu>
      <MenuTrigger
        ref={trigger}
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground shrink-0"
            aria-label={m.rule_menu({ rule: ruleText(rule) })}
          />
        }
      >
        <DotsThreeIcon weight="bold" />
      </MenuTrigger>
      <MenuPopup align="end" className="min-w-44">
        <MenuItem onClick={() => onSeeObjekts(rule, trigger.current)}>
          <EyeIcon />
          {rule.covers === 1
            ? m.rule_see_objekts_one()
            : m.rule_see_objekts({ count: rule.covers.toLocaleString(getLocale()) })}
        </MenuItem>
        <MenuItem onClick={() => onEditRule(rule, trigger.current)}>
          <PencilSimpleIcon />
          {m.rule_edit()}
        </MenuItem>
        <MenuItem onClick={() => onConfirm("detach")}>
          <ListBulletsIcon />
          {m.rule_detach()}
        </MenuItem>
        <MenuSeparator />
        <MenuItem variant="destructive" onClick={() => onConfirm("delete")}>
          <TrashIcon />
          {m.rule_delete()}
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

/**
 * See objekts in the side sheet: the list page's grid of what a rule covers, a heading per
 * collection where those help, the held ones faded. A page at a time, as the end comes near.
 */
export function RuleObjektsSheet({ slug, rule }: { slug: string; rule: Rule }) {
  const query = useInfiniteQuery(ruleObjektsOptions(slug, rule.id));
  const groups = query.data ? mergeRulePages(query.data.pages) : [];
  const headed = query.data?.pages[0]?.headed ?? false;
  const sections = headed
    ? groups.map((group) => ({
        title: `${shortNo(group.season, group.collectionNo)} · ${m.rule_can_match({
          count: group.canMatch.toLocaleString(getLocale()),
        })}`,
        items: group.objekts,
      }))
    : [{ title: null, items: groups.flatMap((group) => group.objekts) }];

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display">{ruleText(rule)}</SheetTitle>
        <SheetDescription>{m.rule_faded_note()}</SheetDescription>
      </SheetHeader>
      <SheetPanel>
        {query.data === undefined ? (
          query.isError ? (
            <LoadError bordered={false} error={query.error} onRetry={() => void query.refetch()} />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-3">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="rounded-photocard aspect-photocard" />
              ))}
            </div>
          )
        ) : groups.length === 0 && !query.hasNextPage ? (
          <p className="text-muted-foreground text-sm">{m.rule_no_collections()}</p>
        ) : (
          <PanelCardGrid
            sections={sections}
            getKey={(objekt) => objekt.slug}
            renderItem={(objekt) => (
              <ObjektCard objekt={objekt} faded={!objekt.wanted} hideLabel={false} />
            )}
            more={{
              has: query.hasNextPage,
              loading: query.isFetchingNextPage,
              failed: query.isFetchNextPageError,
              load: () => void query.fetchNextPage({ cancelRefetch: false }),
            }}
          />
        )}
      </SheetPanel>
    </>
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
