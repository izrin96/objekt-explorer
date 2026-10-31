import {
  type PlanList,
  type PostKind,
  type PostPlan,
  partnerOf,
  rowBlock,
} from "@repo/api/schemas/trade-post";
import { Link } from "@tanstack/react-router";
import { useId } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { joinSentences, joinList } from "@/lib/text";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { unpairedNames } from "./composer-choice";
import {
  type Slot,
  SLOT_HEADING,
  rowNote,
  matchLines,
  previewTags,
  unpairText,
} from "./post-kind-text";
import { TagBadges } from "./tag-label";

const NONE = "__none__";

type Prompt = { partner: string; onUnpair: () => void; onPickAnother: () => void };

export function ListSection({
  slot,
  kind,
  optional,
  lists,
  value,
  otherPicked,
  replaces,
  prompt,
  onPick,
  onDone,
}: {
  slot: Slot;
  kind: PostKind;
  /** a Swap post may leave either side out */
  optional: boolean;
  lists: PlanList[];
  value: string | null;
  /** on a Swap post, the other side is picked, so a list no longer brings its partner along */
  otherPicked: boolean;
  replaces: string | null;
  prompt: Prompt | null;
  onPick: (slug: string | null) => void;
  onDone: () => void;
}) {
  const id = useId();
  const candidates = lists.filter((list) => list.listType === slot);

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-2">
      <h3 id={`${id}-heading`} className="text-sm font-medium">
        {SLOT_HEADING[slot]()}
      </h3>
      {candidates.length === 0 ? (
        <p className="text-muted-foreground text-xs text-pretty">
          {m.trade_composer_none_of_type()}{" "}
          <Button
            variant="link"
            className="h-auto p-0 text-xs underline underline-offset-2"
            render={<Link to="/list" />}
            onClick={onDone}
          >
            {m.nav_create_list()}
          </Button>
        </p>
      ) : (
        <RadioGroup
          aria-labelledby={`${id}-heading`}
          value={value ?? NONE}
          onValueChange={(next) => onPick(next === NONE ? null : String(next))}
          className="gap-1.5"
        >
          {optional ? (
            <ListRow id={`${id}-none`} value={NONE} name={m.trade_composer_no_list()} />
          ) : null}
          {candidates.map((list) => {
            const block = rowBlock(lists, list, kind, replaces, otherPicked);
            const note = rowNote(block, partnerOf(lists, list)?.name ?? null);
            return (
              <ListRow
                key={list.id}
                id={`${id}-${list.id}`}
                value={list.slug}
                name={list.name}
                note={note}
                disabled={block !== null}
                promptId={prompt && value === list.slug ? `${id}-prompt` : undefined}
              />
            );
          })}
        </RadioGroup>
      )}
      {/* outside the radio group, whose arrow-key focus would otherwise pass over its buttons */}
      {prompt && candidates.some((list) => list.slug === value) ? (
        <UnpairPrompt id={`${id}-prompt`} kind={kind} prompt={prompt} />
      ) : null}
    </section>
  );
}

function ListRow({
  id,
  value,
  name,
  note,
  disabled,
  promptId,
}: {
  id: string;
  value: string;
  name: string;
  note?: string | null;
  disabled?: boolean;
  /** the unpair prompt this row raised, below the group */
  promptId?: string;
}) {
  const describedBy = [note ? `${id}-note` : null, promptId ?? null].filter(Boolean).join(" ");
  return (
    <div className="has-data-checked:border-accent-solid has-data-checked:bg-accent flex flex-col gap-2.5 rounded-lg border px-3 py-2.5">
      <Label
        htmlFor={id}
        className={cn(
          "flex min-w-0 cursor-pointer items-start gap-2.5 font-normal",
          disabled && "cursor-not-allowed opacity-64",
        )}
      >
        <Radio
          id={id}
          value={value}
          disabled={disabled}
          className="mt-0.5"
          aria-describedby={describedBy || undefined}
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium break-words">{name}</span>
          {note ? (
            <span id={`${id}-note`} className="text-muted-foreground text-xs text-pretty">
              {note}
            </span>
          ) : null}
        </span>
      </Label>
    </div>
  );
}

function UnpairPrompt({ id, kind, prompt }: { id: string; kind: PostKind; prompt: Prompt }) {
  return (
    <Alert id={id}>
      <AlertDescription className="text-foreground">
        {unpairText(kind, prompt.partner)}
        <span className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={prompt.onUnpair}>
            {m.trade_composer_unpair_action()}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={prompt.onPickAnother}>
            {m.trade_composer_pick_another()}
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}

/** A post option under the lists: Swap's "also pay", Sell's "also open to swaps". */
export function OptionCheck({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex min-w-0 items-start gap-2.5 rounded-lg border px-3 py-2.5 font-normal",
        disabled && "cursor-not-allowed opacity-64",
      )}
    >
      <Checkbox
        id={id}
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-describedby={`${id}-hint`}
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span id={`${id}-hint`} className="text-muted-foreground text-xs text-pretty">
          {hint}
        </span>
      </span>
    </Label>
  );
}

/** Names the lists posting will unpair, so the unpair the viewer chose stays in sight. */
export function UnpairedNote({
  lists,
  plan,
  picked,
}: {
  lists: PlanList[];
  plan: Extract<PostPlan, { ok: true }>;
  picked: { have: string | null; want: string | null; sale: string | null };
}) {
  const names = unpairedNames(lists, plan, picked);
  if (names.length === 0) return null;
  return (
    <p className="text-muted-foreground text-xs text-pretty">
      {m.trade_composer_unpaired({ name: joinList(names) })}
    </p>
  );
}

export function Preview({
  kind,
  have,
  want,
  sale,
  alsoPay,
  alsoSwap,
}: {
  kind: PostKind;
  have: boolean;
  want: boolean;
  sale: boolean;
  alsoPay: boolean;
  alsoSwap: boolean;
}) {
  const picks = { kind, have, want, sale, alsoPay, alsoSwap };
  return (
    <div className="bg-muted/40 flex flex-col gap-1.5 rounded-lg border px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">{m.trade_composer_shows_as()}</span>
        <TagBadges tags={previewTags(picks)} />
      </div>
      {/* polite, so the match line reads out as the picks change it */}
      <p aria-live="polite" className="text-sm text-pretty">
        {joinSentences(matchLines(picks))}
      </p>
    </div>
  );
}
