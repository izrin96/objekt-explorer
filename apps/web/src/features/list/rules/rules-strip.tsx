import {
  CaretDownIcon,
  DotsThreeIcon,
  EyeIcon,
  ListBulletsIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { WindowVirtualizer } from "virtua";

import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { useElementSize } from "@/hooks/use-element-size";
import type { client } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { joinList } from "@/lib/text";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { useListTarget } from "../list-provider";
import { RatioChip } from "../ratio-chip";
import { appliedRatio } from "../ratio-text";
import { useListOwned } from "../use-list-owned";
import { ConfirmRule } from "./confirm-rule";
import { ruleObjektsOptions, useListRules } from "./queries";
import { RuleDialog } from "./rule-dialog";
import { mergeRulePages, ruleColumns, ruleRows } from "./rule-layout";
import { ruleText, shortNo } from "./words";

type Rule = Awaited<ReturnType<typeof client.list.rules>>[number];

/** A want list's rules, between its header and its filter bar. Nothing when it holds none. */
export function RulesStrip() {
  const list = useListTarget();
  const { data: rules } = useListRules(list.slug, list.listType);
  const [open, setOpen] = useState(true);

  if (list.listType !== "want" || !rules || rules.length === 0) return null;
  const canMatch = rules.reduce((sum, rule) => sum + rule.canMatch, 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border">
      <CollapsibleTrigger className="hover:bg-muted/48 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start">
        <ListBulletsIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <span className="text-sm font-semibold">{m.rules_heading()}</span>
        <span className="text-muted-foreground text-sm">
          {m.rules_summary({
            count: rules.length.toLocaleString(getLocale()),
            canMatch: canMatch.toLocaleString(getLocale()),
          })}
        </span>
        <CaretDownIcon
          aria-hidden
          className={cn(
            "text-muted-foreground ms-auto size-4 shrink-0 motion-safe:transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <ul className="flex flex-col border-t">
          {rules.map((rule) => (
            <RuleRow key={rule.id} rule={rule} />
          ))}
        </ul>
      </CollapsiblePanel>
    </Collapsible>
  );
}

function RuleRow({ rule }: { rule: Rule }) {
  const list = useListTarget();
  const isOwner = useListOwned();
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "detach" | null>(null);
  const ratio = appliedRatio(rule.ratio, list.ratio);

  const details = [
    // an any-class rule spans every number, so its range says nothing
    rule.kind === "set" && rule.class !== null && rule.range
      ? rule.range.from === rule.range.to
        ? shortNo(rule.season, rule.range.from)
        : `${shortNo(rule.season, rule.range.from)}–${shortNo(rule.season, rule.range.to)}`
      : null,
    rule.prio.length > 0 ? m.rule_prio_line({ members: joinList(rule.prio, "compact") }) : null,
    rule.skipOwned
      ? rule.owned > 0
        ? // the count is the list owner's holdings, so only the owner reads "you"
          isOwner
          ? m.rule_skips_owned({ count: rule.owned.toLocaleString(getLocale()) })
          : m.rule_skips_owned_theirs({ count: rule.owned.toLocaleString(getLocale()) })
        : null
      : isOwner
        ? m.rule_includes_owned()
        : m.rule_includes_owned_theirs(),
  ].filter((part) => part !== null);

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      render={<li />}
      className="flex flex-col border-b last:border-b-0"
    >
      <div className="flex items-center gap-1 pe-2">
        {/* the rule itself opens its objekts, so a phone keeps the row's width for it */}
        <CollapsibleTrigger className="hover:bg-muted/48 focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2.5 ps-3 pe-2 text-start outline-none focus-visible:ring-2">
          <CaretDownIcon
            aria-hidden
            className={cn(
              "text-muted-foreground size-4 shrink-0 motion-safe:transition-transform",
              !expanded && "-rotate-90",
            )}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm text-pretty">
              {ruleText(rule)}
              {ratio ? (
                <>
                  {" "}
                  <RatioChip
                    ratio={ratio.ratio}
                    side="want"
                    owner={isOwner}
                    inherited={ratio.inherited}
                    className="align-text-bottom"
                  />
                </>
              ) : null}
            </span>
            {details.length > 0 ? (
              <span className="text-muted-foreground line-clamp-2 text-xs">
                {details.join(" · ")}
              </span>
            ) : null}
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <span className="text-sm font-semibold tabular-nums">
              {rule.canMatch.toLocaleString(getLocale())}
            </span>
            <span className="text-muted-foreground text-xs">{m.rule_can_match_label()}</span>
          </span>
        </CollapsibleTrigger>
        {isOwner ? (
          <Menu>
            <MenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={m.rule_menu({ rule: ruleText(rule) })}
                />
              }
            >
              <DotsThreeIcon weight="bold" />
            </MenuTrigger>
            <MenuPopup align="end" className="min-w-44">
              <MenuItem onClick={() => setExpanded((value) => !value)}>
                <EyeIcon />
                {expanded
                  ? m.rule_hide_objekts()
                  : rule.covers === 1
                    ? m.rule_see_objekts_one()
                    : m.rule_see_objekts({ count: rule.covers.toLocaleString(getLocale()) })}
              </MenuItem>
              <MenuItem onClick={() => setEditOpen(true)}>
                <PencilSimpleIcon />
                {m.rule_edit()}
              </MenuItem>
              <MenuItem onClick={() => setConfirm("detach")}>
                <ListBulletsIcon />
                {m.rule_detach()}
              </MenuItem>
              <MenuSeparator />
              <MenuItem variant="destructive" onClick={() => setConfirm("delete")}>
                <TrashIcon />
                {m.rule_delete()}
              </MenuItem>
            </MenuPopup>
          </Menu>
        ) : null}
      </div>
      <CollapsiblePanel className="motion-reduce:transition-none">
        <RuleObjekts slug={list.slug} ruleId={rule.id} owner={isOwner} />
      </CollapsiblePanel>
      {isOwner ? (
        <>
          <RuleDialog
            slug={list.slug}
            listName={list.name}
            listRatio={list.ratio ?? null}
            rule={rule}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <ConfirmRule
            slug={list.slug}
            rule={rule}
            action={confirm}
            onClose={() => setConfirm(null)}
          />
        </>
      ) : null}
    </Collapsible>
  );
}

/**
 * See the objekts: one grid, the held ones faded, with a heading per collection where those help.
 * A page at a time, the next one loading as the grid's end comes near.
 */
function RuleObjekts({ slug, ruleId, owner }: { slug: string; ruleId: number; owner: boolean }) {
  const query = useInfiniteQuery(ruleObjektsOptions(slug, ruleId));

  if (query.isPending) {
    return (
      <div className="flex justify-center px-3 pb-3">
        <Spinner className="size-5" />
      </div>
    );
  }
  // a failed next page keeps what loaded, with the sentinel's retry
  if (query.data === undefined) {
    return (
      <p className="text-destructive-foreground px-3 pb-3 text-sm">{refusalText(query.error)}</p>
    );
  }
  const groups = mergeRulePages(query.data.pages);
  if (groups.length === 0 && !query.hasNextPage) {
    return <p className="text-muted-foreground px-3 pb-3 text-sm">{m.rule_no_collections()}</p>;
  }

  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      <RuleObjektRows groups={groups} headed={query.data.pages[0]?.headed ?? false} />
      <InfiniteSentinel
        label={m.infinite_query_load_more_aria()}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        isError={query.isFetchNextPageError}
        fetchNextPage={() => void query.fetchNextPage({ cancelRefetch: false })}
      />
      <p className="text-muted-foreground text-xs">
        {owner ? m.rule_faded_note() : m.rule_faded_note_theirs()}
      </p>
    </div>
  );
}

type RuleGroup = Awaited<ReturnType<typeof client.list.ruleObjekts>>["groups"][number];

/**
 * A rule can cover thousands of collections, so its grid is virtualised by row against the
 * page's scroll; the column count follows the strip's width, four at the least.
 */
function RuleObjektRows({ groups, headed }: { groups: RuleGroup[]; headed: boolean }) {
  const [ref, { width }] = useElementSize<HTMLDivElement>();
  const columns = ruleColumns(width);
  const rows = ruleRows(groups, headed, columns);

  return (
    <div ref={ref}>
      {/* `key`: every row's height changes with the column count, and virtua keeps what it
          measured */}
      {width > 0 ? (
        <WindowVirtualizer key={columns} data={rows}>
          {(row) =>
            row.type === "heading" ? (
              <h4
                key={row.key}
                className={cn("text-muted-foreground pb-2 text-xs", !row.first && "border-t pt-2")}
              >
                <span className="text-foreground font-mono font-semibold">
                  {shortNo(row.group.season, row.group.collectionNo)}
                </span>
                {" · "}
                {m.rule_can_match({ count: row.group.canMatch.toLocaleString(getLocale()) })}
              </h4>
            ) : (
              <ul
                key={row.key}
                className="grid gap-2 pb-2"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {row.objekts.map((objekt) => (
                  <li key={objekt.slug}>
                    <ObjektCard objekt={objekt} faded={!objekt.wanted} hideLabel={false} />
                  </li>
                ))}
              </ul>
            )
          }
        </WindowVirtualizer>
      ) : null}
    </div>
  );
}
