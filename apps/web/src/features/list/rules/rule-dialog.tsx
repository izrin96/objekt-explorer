import {
  type ListRuleDef,
  type ListRuleInput,
  ruleHasEditions,
  RULE_EDITIONS,
  RULE_MAX_OBJEKTS,
  ruleDef,
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
import { RadioGroup, RadioPrimitive } from "@/components/ui/radio-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { FilterToggle } from "@/features/filters/filter-toggle";
import { client, orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { RULE_KEYS } from "./queries";
import { ruleText } from "./words";

const ANY = "__any__";
const ORDINAL = ["", "1st", "2nd", "3rd"];

type Draft = {
  kind: "collection" | "set";
  artist: ValidArtist;
  season: string | null;
  /** digits only; the online suffix is added on save */
  collectionNo: string;
  cls: string;
  editions: number[];
  members: string[];
  prio: string[];
  skipOwned: boolean;
};

function toInput(draft: Draft): ListRuleInput | null {
  const artist = draft.artist.toLowerCase();
  if (draft.kind === "collection") {
    const digits = draft.collectionNo.trim();
    if (!/^\d{3}$/.test(digits) || !draft.season) return null;
    return {
      kind: "collection",
      artist,
      season: draft.season,
      collectionNo: `${digits}Z`,
      prio: draft.prio,
      skipOwned: draft.skipOwned,
    };
  }
  return {
    kind: "set",
    artist,
    season: draft.season,
    class: draft.cls,
    editions: ruleHasEditions(draft.artist, draft.cls) ? draft.editions : [],
    members: draft.members,
    skipOwned: draft.skipOwned,
  };
}

function fromRule(rule: ListRuleDef, artists: ValidArtist[]): Draft {
  return {
    kind: rule.kind,
    artist: artists.find((a) => a.toLowerCase() === rule.artist) ?? artists[0]!,
    season: rule.season,
    collectionNo: (rule.collectionNo ?? "").replace(/[A-Z]$/, ""),
    cls: rule.class ?? "First",
    editions: rule.editions,
    members: rule.members,
    prio: rule.prio,
    skipOwned: rule.skipOwned,
  };
}

const toggle = <T,>(items: T[], item: T) =>
  items.includes(item) ? items.filter((i) => i !== item) : [...items, item];

const RULE_KINDS = [
  {
    value: "collection",
    label: m.rule_kind_collection,
    desc: m.rule_kind_collection_desc,
    example: m.rule_kind_collection_example,
  },
  {
    value: "set",
    label: m.rule_kind_set,
    desc: m.rule_kind_set_desc,
    example: m.rule_kind_set_example,
  },
] as const;
/**
 * Add rule, or Edit rule when `rule` is given. The live line asks the server what the rule
 * covers for the caller's own holdings, so the counts match what saving would do.
 */
export function RuleDialog({
  slug,
  listName,
  rule,
  initial,
  open,
  onOpenChange,
}: {
  slug: string;
  listName: string;
  rule?: { id: number } & ListRuleDef;
  /** a fresh dialog's starting rule, say from Add to list */
  initial?: ListRuleDef;
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
            initial={initial}
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
  initial,
  onDone,
}: {
  slug: string;
  listName: string;
  rule?: { id: number } & ListRuleDef;
  initial?: ListRuleDef;
  onDone: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const { artists, selectedArtists } = useCosmoArtist();
  const artistIds = artists.map((a) => a.id);
  const { data: filterData } = useQuery(orpc.config.getFilterData.queryOptions());

  const [draft, setDraft] = useState<Draft>(() => {
    const start = rule ?? initial;
    if (start) return fromRule(start, artistIds);
    const artist = selectedArtists[0]?.id ?? artistIds[0]!;
    const seasons = filterData?.seasonsMap.find((s) => s.artistId === artist)?.seasons ?? [];
    return {
      kind: "set",
      artist,
      season: seasons.at(-1) ?? null,
      collectionNo: "",
      cls: "First",
      editions: [],
      members: [],
      prio: [],
      skipOwned: true,
    };
  });
  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const seasonsOf = (artist: string) =>
    filterData?.seasonsMap.find((s) => s.artistId === artist)?.seasons ?? [];
  const seasons = seasonsOf(draft.artist);
  // a collection rule has no Any season, so an empty season there falls back to the newest
  const seasonFor = (kind: Draft["kind"], artist: string, season: string | null) =>
    kind === "collection" && season === null ? (seasonsOf(artist).at(-1) ?? null) : season;
  const classes = filterData?.classesMap.find((c) => c.artistId === draft.artist)?.classes ?? [];
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
  // counts for another rule (the deferred one still catching up, or the previous result kept
  // while the new one loads) say nothing about this one
  const current =
    input !== null &&
    !preview.isPlaceholderData &&
    JSON.stringify(deferred) === JSON.stringify(input);
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
        {/* each kind says what it takes and shows one, since the two read alike by name */}
        <RadioGroup
          aria-label={m.rule_kind_label()}
          value={draft.kind}
          onValueChange={(next) => {
            const kind = RULE_KINDS.find((item) => item.value === next)?.value;
            if (kind) set({ kind, season: seasonFor(kind, draft.artist, draft.season) });
          }}
          className="gap-2"
        >
          {RULE_KINDS.map((item) => (
            <RadioPrimitive.Root
              key={item.value}
              value={item.value}
              aria-describedby={`${id}-kind-${item.value}`}
              className={cn(
                "focus-visible:ring-ring focus-visible:ring-offset-background hover:bg-muted flex w-full cursor-pointer flex-col items-start gap-1 rounded-lg border p-3 text-start outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                "data-checked:border-accent-solid data-checked:bg-accent",
              )}
            >
              <span className="text-sm font-medium">{item.label()}</span>
              <span
                id={`${id}-kind-${item.value}`}
                className="text-muted-foreground flex flex-col gap-0.5 text-xs text-pretty"
              >
                <span>{item.desc()}</span>
                <span className="font-mono">{item.example()}</span>
              </span>
            </RadioPrimitive.Root>
          ))}
        </RadioGroup>

        {artists.length > 1 ? (
          <RuleSelect
            id={`${id}-artist`}
            label={m.rule_artist()}
            value={draft.artist}
            options={artists.map((a) => ({ value: a.id, label: a.title ?? a.id }))}
            onChange={(artist) =>
              set({
                artist: artist as ValidArtist,
                season: seasonFor(draft.kind, artist, null),
                members: [],
                prio: [],
              })
            }
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {draft.kind === "set" ? (
            <RuleSelect
              id={`${id}-class`}
              label={m.rule_class()}
              value={draft.cls}
              options={classes.map((cls) => ({ value: cls, label: cls }))}
              onChange={(cls) => set({ cls, editions: [] })}
            />
          ) : null}
          <RuleSelect
            id={`${id}-season`}
            label={m.rule_season()}
            value={draft.season ?? ANY}
            options={[
              ...(draft.kind === "set" ? [{ value: ANY, label: m.rule_any_season() }] : []),
              ...seasons.toReversed().map((season) => ({ value: season, label: season })),
            ]}
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
                onChange={(event) =>
                  set({ collectionNo: event.target.value.replace(/\D/g, "").slice(0, 3) })
                }
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
                label={ORDINAL[edition]!}
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
                onPressedChange={() => set({ prio: toggle(draft.prio, member).slice(0, 6) })}
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

/** The live line: the rule's name, its counts, and why it can't be added. */
function RulePreview({
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
        problem: "too_wide" | "nothing_to_match" | "no_collections" | null;
      }
    | undefined;
  pending: boolean;
}) {
  if (input === null) {
    return <p className="text-muted-foreground text-sm">{m.rule_incomplete()}</p>;
  }
  const label = ruleText(ruleDef(input));
  return (
    <div
      role="status"
      aria-busy={pending}
      className="bg-muted/48 flex flex-col gap-1 rounded-lg border px-3 py-2.5"
    >
      <span className="font-mono text-sm">{label}</span>
      {counts === undefined ? (
        <span className="text-muted-foreground text-xs">{m.rule_counting()}</span>
      ) : counts.problem === "no_collections" ? (
        <span className="text-destructive-foreground text-xs text-pretty">
          {m.rule_no_collections()}
        </span>
      ) : counts.problem === "too_wide" ? (
        <span className="text-destructive-foreground text-xs text-pretty">
          {m.rule_too_wide({ count: counts.covers, max: RULE_MAX_OBJEKTS })}{" "}
          {m.rule_too_wide_hint()}
        </span>
      ) : (
        <>
          <span className="text-muted-foreground text-xs tabular-nums">
            {m.rule_preview_counts({ covers: counts.covers, owned: counts.owned })} ·{" "}
            <span className="text-foreground font-medium">
              {m.rule_can_match({ count: counts.canMatch })}
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
  );
}

function RuleSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        onValueChange={(next: string | null) => {
          if (next !== null) onChange(next);
        }}
      >
        <SelectTrigger id={id} className="min-w-0">
          <SelectValue>
            {(next: string) => options.find((option) => option.value === next)?.label ?? next}
          </SelectValue>
        </SelectTrigger>
        <SelectPopup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </div>
  );
}

function ChipGroup({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      {description ? (
        <p className="text-muted-foreground -mt-1 text-xs text-pretty">{description}</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}
