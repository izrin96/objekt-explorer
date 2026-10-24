import {
  CaretDownIcon,
  DotsThreeIcon,
  EyeIcon,
  ListBulletsIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { toastManager } from "@/components/ui/toast";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { client, orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useListTarget } from "../list-provider";
import { useListOwned } from "../use-list-owned";
import { listRulesOptions, RULE_KEYS, ruleObjektsOptions } from "./queries";
import { RuleDialog } from "./rule-dialog";
import { ruleText, shortNo } from "./words";

type Rule = Awaited<ReturnType<typeof client.list.rules>>[number];

/** A want list's rules, between its header and its filter bar. Nothing when it holds none. */
export function RulesStrip() {
  const list = useListTarget();
  const { data: rules } = useQuery({
    ...listRulesOptions(list.slug),
    enabled: list.listType === "want",
  });
  const [open, setOpen] = useState(true);

  if (list.listType !== "want" || !rules || rules.length === 0) return null;
  const canMatch = rules.reduce((sum, rule) => sum + rule.canMatch, 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border">
      <CollapsibleTrigger className="hover:bg-muted/48 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start">
        <ListBulletsIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <span className="text-sm font-semibold">{m.rules_heading()}</span>
        <span className="text-muted-foreground text-sm tabular-nums">
          {m.rules_summary({ count: rules.length, canMatch })}
        </span>
        <CaretDownIcon
          aria-hidden
          className={cn(
            "text-muted-foreground ms-auto size-4 shrink-0 transition-transform",
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

  const details = [
    rule.kind === "set" && rule.range
      ? rule.range.from === rule.range.to
        ? shortNo(rule.season, rule.range.from)
        : `${shortNo(rule.season, rule.range.from)}–${shortNo(rule.season, rule.range.to)}`
      : null,
    rule.prio.length > 0 ? m.rule_prio_line({ members: rule.prio.join(", ") }) : null,
    rule.skipOwned
      ? rule.owned > 0
        ? m.rule_skips_owned({ count: rule.owned })
        : null
      : m.rule_includes_owned(),
  ].filter((part) => part !== null);

  return (
    <li className="flex flex-col border-b last:border-b-0">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-mono text-sm text-pretty">{ruleText(rule)}</span>
          {details.length > 0 ? (
            <span className="text-muted-foreground truncate text-xs">{details.join(" · ")}</span>
          ) : null}
        </div>
        <span className="flex shrink-0 flex-col items-end">
          <span className="font-mono text-sm font-semibold tabular-nums">{rule.canMatch}</span>
          <span className="text-muted-foreground text-xs">{m.rule_can_match_label()}</span>
        </span>
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
                {expanded ? m.rule_hide_objekts() : m.rule_see_objekts({ count: rule.covers })}
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
      {expanded ? <RuleObjekts slug={list.slug} ruleId={rule.id} /> : null}
      {isOwner ? (
        <>
          <RuleDialog
            slug={list.slug}
            listName={list.name}
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
    </li>
  );
}

/** See the objekts: one tab per collection number, the held ones faded. */
function RuleObjekts({ slug, ruleId }: { slug: string; ruleId: number }) {
  const { data, isPending, error } = useQuery(ruleObjektsOptions(slug, ruleId));

  if (isPending) {
    return (
      <div className="flex justify-center px-3 pb-3">
        <Spinner className="size-5" />
      </div>
    );
  }
  if (error) {
    return <p className="text-destructive-foreground px-3 pb-3 text-sm">{refusalText(error)}</p>;
  }
  const first = data.groups[0];
  if (!first) {
    return <p className="text-muted-foreground px-3 pb-3 text-sm">{m.rule_no_collections()}</p>;
  }

  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      <Tabs defaultValue={first.collectionNo}>
        <div className="overflow-x-auto overflow-y-hidden" data-scroll-x>
          <TabsList variant="underline">
            {data.groups.map((group) => (
              <TabsTab key={group.collectionNo} value={group.collectionNo} className="font-mono">
                {m.rule_tab({
                  no: shortNo(group.objekts[0]?.season ?? null, group.collectionNo),
                  count: group.canMatch,
                })}
              </TabsTab>
            ))}
          </TabsList>
        </div>
        {data.groups.map((group) => (
          <TabsPanel key={group.collectionNo} value={group.collectionNo}>
            <ul className="grid grid-cols-4 gap-2 pt-2 sm:grid-cols-6 lg:grid-cols-8">
              {group.objekts.map((objekt) => (
                <li key={objekt.slug}>
                  <ObjektCard objekt={objekt} faded={!objekt.wanted} hideLabel={false} />
                </li>
              ))}
            </ul>
          </TabsPanel>
        ))}
      </Tabs>
      <p className="text-muted-foreground text-xs">{m.rule_faded_note()}</p>
    </div>
  );
}

function ConfirmRule({
  slug,
  rule,
  action,
  onClose,
}: {
  slug: string;
  rule: Rule;
  action: "delete" | "detach" | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const run = useMutation({
    mutationFn: (kind: "delete" | "detach") =>
      kind === "delete"
        ? client.list.deleteRule({ slug, ruleId: rule.id })
        : client.list.detachRule({ slug, ruleId: rule.id }),
    onSuccess: async (_data, kind) => {
      onClose();
      toastManager.add({
        type: "success",
        title: kind === "delete" ? m.rule_deleted() : m.rule_detached({ count: rule.canMatch }),
      });
      await Promise.all(
        [...RULE_KEYS, orpc.list.key()].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
    onError: (error) => {
      toastManager.add({ type: "error", title: m.rule_error(), description: refusalText(error) });
    },
  });

  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogPopup className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">
            {action === "detach" ? m.rule_detach_title() : m.rule_delete_title()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span className="text-foreground font-mono">{ruleText(rule)}</span> —{" "}
            {action === "detach"
              ? m.rule_detach_desc({ count: rule.canMatch })
              : m.rule_delete_desc()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose}>
            {m.common_modal_cancel()}
          </Button>
          <Button
            variant={action === "delete" ? "destructive" : "default"}
            loading={run.isPending}
            onClick={() => action && run.mutate(action)}
          >
            {action === "detach" ? m.rule_detach() : m.rule_delete()}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
