import {
  type ListRuleDef,
  type ListRuleInput,
  ruleHasEditions,
  RULE_EDITIONS,
} from "@repo/api/schemas/list-rule";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { FilterToggle } from "@/features/filters/filter-toggle";
import { client, orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

import { RULE_KEYS } from "./queries";
import {
  ANY,
  artistPatch,
  classesOf,
  classOptions,
  collectionDigits,
  editionLabel,
  fromRule,
  kindPatch,
  newDraft,
  previewIsCurrent,
  type RuleDraft,
  seasonOptions,
  seasonsOf,
  toggle,
  toInput,
  togglePrio,
} from "./rule-draft";
import { ChipGroup, RuleKindRadio, RuleSelect } from "./rule-fields";
import { RulePreview } from "./rule-preview";

/**
 * Add rule, or Edit rule when `rule` is given. The live line asks the server what the rule
 * covers for the caller's own holdings, so the counts match what saving would do.
 */
export function RuleDialog({
  slug,
  listName,
  rule,
  open,
  onOpenChange,
}: {
  slug: string;
  listName: string;
  rule?: { id: number } & ListRuleDef;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-lg">
        {open ? (
          <RuleForm
            slug={slug}
            listName={listName}
            rule={rule}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}

function RuleForm({
  slug,
  listName,
  rule,
  onDone,
}: {
  slug: string;
  listName: string;
  rule?: { id: number } & ListRuleDef;
  onDone: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const { artists, selectedArtists } = useCosmoArtist();
  const artistIds = artists.map((a) => a.id);
  const { data: filterData } = useQuery(orpc.config.getFilterData.queryOptions());

  const [draft, setDraft] = useState<RuleDraft>(() => {
    if (rule) return fromRule(rule, artistIds);
    const artist = selectedArtists[0]?.id ?? artistIds[0]!;
    return newDraft(artist, seasonsOf(filterData, artist));
  });
  const set = (patch: Partial<RuleDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const seasons = seasonsOf(filterData, draft.artist);
  const classes = classesOf(filterData, draft.artist);
  const members =
    artists.find((a) => a.id === draft.artist)?.artistMembers.map((member) => member.name) ?? [];
  const hasEditions = draft.kind === "set" && ruleHasEditions(draft.artist, draft.cls);

  const input = toInput(draft);
  const deferred = useDeferredValue(input);
  const preview = useQuery(
    orpc.list.previewRule.queryOptions({
      input: { rule: deferred! },
      enabled: deferred !== null,
      placeholderData: keepPreviousData,
      staleTime: 30_000,
    }),
  );
  const current = previewIsCurrent(input, deferred, preview.isPlaceholderData);
  const counts = current ? preview.data : undefined;
  const problem = counts?.problem ?? null;

  const save = useMutation({
    mutationFn: async (next: ListRuleInput) => {
      if (rule) await client.list.updateRule({ slug, ruleId: rule.id, rule: next });
      else await client.list.addRule({ slug, rule: next });
    },
    onSuccess: async () => {
      onDone();
      toastManager.add({ type: "success", title: rule ? m.rule_saved() : m.rule_added() });
      await Promise.all(RULE_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    onError: (error) => {
      toastManager.add({ type: "error", title: m.rule_error(), description: refusalText(error) });
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">
          {rule ? m.rule_edit_title() : m.rule_add_title()}
        </DialogTitle>
        <DialogDescription>{m.rule_add_desc({ list: listName })}</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <RuleKindRadio
          id={id}
          value={draft.kind}
          onChange={(kind) => set(kindPatch(draft, kind, seasons))}
        />

        {artists.length > 1 ? (
          <RuleSelect
            id={`${id}-artist`}
            label={m.rule_artist()}
            value={draft.artist}
            options={artists.map((a) => ({ value: a.id, label: a.title ?? a.id }))}
            onChange={(artist) =>
              set(
                artistPatch(draft, artist as ValidArtist, {
                  seasons: seasonsOf(filterData, artist),
                  classes: classesOf(filterData, artist),
                }),
              )
            }
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {draft.kind === "set" ? (
            <RuleSelect
              id={`${id}-class`}
              label={m.rule_class()}
              value={draft.cls ?? ANY}
              options={classOptions(classes)}
              onChange={(cls) => set({ cls: cls === ANY ? null : cls, editions: [] })}
            />
          ) : null}
          <RuleSelect
            id={`${id}-season`}
            label={m.rule_season()}
            value={draft.season ?? ANY}
            options={seasonOptions(draft.kind, seasons)}
            onChange={(season) => set({ season: season === ANY ? null : season })}
          />
          {draft.kind === "collection" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-no`}>{m.rule_collection_no()}</Label>
              <Input
                id={`${id}-no`}
                inputMode="numeric"
                maxLength={3}
                placeholder="366"
                className="font-mono"
                value={draft.collectionNo}
                onChange={(event) => set({ collectionNo: collectionDigits(event.target.value) })}
              />
            </div>
          ) : null}
        </div>

        {hasEditions ? (
          <ChipGroup label={m.rule_edition()}>
            <FilterToggle
              label={m.rule_any_edition()}
              pressed={draft.editions.length === 0}
              onPressedChange={() => set({ editions: [] })}
            />
            {RULE_EDITIONS.map((edition) => (
              <FilterToggle
                key={edition}
                label={editionLabel(edition)}
                pressed={draft.editions.includes(edition)}
                onPressedChange={() => set({ editions: toggle(draft.editions, edition) })}
              />
            ))}
          </ChipGroup>
        ) : null}

        {draft.kind === "set" ? (
          <ChipGroup label={m.rule_members()}>
            <FilterToggle
              label={m.rule_any_member()}
              pressed={draft.members.length === 0}
              onPressedChange={() => set({ members: [] })}
            />
            {members.map((member) => (
              <FilterToggle
                key={member}
                label={member}
                pressed={draft.members.includes(member)}
                onPressedChange={() => set({ members: toggle(draft.members, member) })}
              />
            ))}
          </ChipGroup>
        ) : (
          <ChipGroup label={m.rule_prio()} description={m.rule_prio_desc()}>
            {members.map((member) => (
              <FilterToggle
                key={member}
                label={member}
                pressed={draft.prio.includes(member)}
                onPressedChange={() => set({ prio: togglePrio(draft.prio, member) })}
              />
            ))}
          </ChipGroup>
        )}

        <Label
          htmlFor={`${id}-skip`}
          className="flex min-w-0 items-start justify-between gap-3 font-normal"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium">{m.rule_skip_owned()}</span>
            <span className="text-muted-foreground text-xs text-pretty">
              {m.rule_skip_owned_desc()}
            </span>
          </span>
          <Switch
            id={`${id}-skip`}
            className="mt-0.5 shrink-0"
            checked={draft.skipOwned}
            onCheckedChange={(skipOwned) => set({ skipOwned })}
          />
        </Label>

        <RulePreview input={input} counts={counts} pending={preview.isFetching} />
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button
          loading={save.isPending}
          disabled={input === null || counts === undefined || problem !== null}
          onClick={() => input && save.mutate(input)}
        >
          {rule ? m.rule_save() : m.rule_add()}
        </Button>
      </DialogFooter>
    </>
  );
}
