import { CardsThreeIcon } from "@phosphor-icons/react";
import {
  choiceTags,
  type ComposerStart,
  type PlanList,
  type PostKind,
  planPost,
  partnerOf,
  type RowBlock,
  rowBlock,
} from "@repo/api/schemas/trade-post";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup, RadioPrimitive } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useSavePost } from "./actions";
import { usePlanLists } from "./post-plan";
import { TagBadge } from "./tag-label";

export const NEW_POST: ComposerStart = {
  kind: null,
  have: null,
  want: null,
  sale: null,
  alsoPay: false,
  replaces: null,
};

const KINDS: PostKind[] = ["swap", "sell", "buy"];

export const KIND_LABEL: Record<PostKind, () => string> = {
  swap: m.trade_kind_swap,
  sell: m.trade_kind_sell,
  buy: m.trade_kind_buy,
};

const KIND_DESC: Record<PostKind, () => string> = {
  swap: m.trade_kind_swap_desc,
  sell: m.trade_kind_sell_desc,
  buy: m.trade_kind_buy_desc,
};

const KIND_TITLE: Record<PostKind, () => string> = {
  swap: m.trade_composer_swap_title,
  sell: m.trade_composer_sell_title,
  buy: m.trade_composer_buy_title,
};

const KIND_TAG = { swap: "wtt", sell: "wts", buy: "wtb" } as const;

export const IN_POST: Record<PostKind, () => string> = {
  swap: m.trade_in_swap_post,
  sell: m.trade_in_sell_post,
  buy: m.trade_in_buy_post,
};

type Slot = "have" | "want" | "sale";

const SLOTS_OF: Record<PostKind, Slot[]> = {
  swap: ["have", "want"],
  sell: ["sale"],
  buy: ["want"],
};

const SLOT_HEADING: Record<Slot, () => string> = {
  have: m.trade_composer_have_heading,
  want: m.trade_composer_want_heading,
  sale: m.trade_composer_sale_heading,
};

/** A composer per host: it opens on a start, and each opening starts afresh. */
export function useComposer() {
  const [state, setState] = useState({ open: false, start: NEW_POST, session: 0 });
  return {
    openWith: (start: ComposerStart) =>
      setState((prev) => ({ open: true, start, session: prev.session + 1 })),
    dialog: {
      ...state,
      onOpenChange: (open: boolean) => setState((prev) => ({ ...prev, open })),
    },
  };
}

export type ComposerDialogProps = ReturnType<typeof useComposer>["dialog"];

/** New post and Edit post: what the post is for, then its lists. */
export function PostComposer({ open, start, session, onOpenChange }: ComposerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-lg">
        <Composer key={session} start={start} onDone={() => onOpenChange(false)} />
      </DialogPopup>
    </Dialog>
  );
}

type Choice = {
  kind: PostKind | null;
  have: string | null;
  want: string | null;
  sale: string | null;
  alsoPay: boolean;
  unpair: boolean;
};

function Composer({ start, onDone }: { start: ComposerStart; onDone: () => void }) {
  const lists = usePlanLists();
  const save = useSavePost();
  const [step, setStep] = useState<"kind" | "lists">(start.kind ? "lists" : "kind");
  const [choice, setChoice] = useState<Choice>({ ...start, unpair: false });
  const editing = start.replaces !== null;
  const tradeLists = lists.filter((list) => list.listTypeNew !== "general");

  const setKind = (kind: PostKind) => {
    const keeps = SLOTS_OF[kind];
    setChoice((prev) => ({
      ...prev,
      kind,
      have: keeps.includes("have") ? prev.have : null,
      want: keeps.includes("want") ? prev.want : null,
      sale: keeps.includes("sale") ? prev.sale : null,
      unpair: false,
    }));
  };

  const title = editing
    ? m.trade_composer_edit_title()
    : step === "kind" || !choice.kind
      ? m.trade_composer_title()
      : KIND_TITLE[choice.kind]();

  const header = (
    <DialogHeader>
      {/* clear of the dialog's close button */}
      <div className="flex items-baseline justify-between gap-3 pe-8">
        <DialogTitle className="font-display">{title}</DialogTitle>
        <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
          {m.trade_composer_step({ step: step === "kind" ? "1" : "2" })}
        </span>
      </div>
      <DialogDescription>
        {step === "kind" ? m.trade_composer_kind_prompt() : m.trade_composer_lists_prompt()}
      </DialogDescription>
    </DialogHeader>
  );

  if (tradeLists.length === 0) {
    return (
      <>
        {header}
        <DialogPanel>
          <EmptyState
            icon={CardsThreeIcon}
            bordered={false}
            title={m.trade_post_dialog_empty()}
            action={
              <Button variant="outline" size="sm" render={<Link to="/list" />} onClick={onDone}>
                {m.nav_create_list()}
              </Button>
            }
          />
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
        </DialogFooter>
      </>
    );
  }

  if (step === "kind" || !choice.kind) {
    return (
      <>
        {header}
        <DialogPanel>
          <KindStep kind={choice.kind} onChange={setKind} />
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
          <Button disabled={!choice.kind} onClick={() => setStep("lists")}>
            {m.trade_composer_next()}
          </Button>
        </DialogFooter>
      </>
    );
  }

  const kind = choice.kind;
  const request = {
    kind,
    have: choice.have,
    want: choice.want,
    sale: choice.sale,
    alsoPay: kind === "swap" && choice.want !== null && choice.alsoPay,
    unpair: choice.unpair,
    replaces: start.replaces,
  };
  const plan = planPost(lists, request);

  const pick = (slot: Slot, slug: string | null) => {
    setChoice((prev) => {
      const next = { ...prev, [slot]: slug, unpair: false };
      if (slot === "want" && slug === null) next.alsoPay = false;
      // one half of a pair brings the other half along on a Swap post, unless that side is taken
      const other = slot === "have" ? "want" : "have";
      const list = lists.find((entry) => entry.slug === slug);
      const partner =
        list && kind === "swap" && prev[other] === null ? partnerOf(lists, list) : null;
      if (partner && rowBlock(lists, partner, kind, start.replaces) === null) {
        next[other] = partner.slug;
      }
      return next;
    });
  };

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        // a host form sits above this portal in the React tree, and would get the submit too
        event.stopPropagation();
        if (plan.ok) save.mutate(request, { onSuccess: onDone });
      }}
    >
      {header}
      <DialogPanel className="flex flex-col gap-5">
        {SLOTS_OF[kind].map((slot) => (
          <ListSection
            key={slot}
            slot={slot}
            kind={kind}
            optional={kind === "swap"}
            lists={lists}
            value={choice[slot]}
            otherPicked={kind === "swap" && choice[slot === "have" ? "want" : "have"] !== null}
            replaces={start.replaces}
            prompt={
              !plan.ok &&
              plan.reason === "trade_post_list_paired" &&
              plan.slug === choice[slot] &&
              plan.partner
                ? {
                    partner: lists.find((list) => list.slug === plan.partner)?.name ?? "",
                    onUnpair: () => setChoice((prev) => ({ ...prev, unpair: true })),
                    onPickAnother: () => pick(slot, null),
                  }
                : null
            }
            onPick={(slug) => pick(slot, slug)}
            onDone={onDone}
          />
        ))}
        {kind === "sell" ? (
          <p className="text-muted-foreground -mt-3 text-xs text-pretty">
            {m.trade_composer_sale_note()}
          </p>
        ) : null}
        {kind === "swap" ? (
          <AlsoPay
            checked={request.alsoPay}
            disabled={choice.want === null}
            onChange={(alsoPay) => setChoice((prev) => ({ ...prev, alsoPay }))}
          />
        ) : null}
        {plan.ok ? <UnpairedNote lists={lists} plan={plan} picked={request} /> : null}
        <Preview
          kind={kind}
          have={choice.have !== null}
          want={choice.want !== null}
          sale={choice.sale !== null}
          alsoPay={request.alsoPay}
        />
      </DialogPanel>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={() => setStep("kind")}>
          {m.trade_composer_back()}
        </Button>
        <Button type="submit" disabled={!plan.ok} loading={save.isPending}>
          {editing ? m.common_actions_save() : m.trade_composer_post()}
        </Button>
      </DialogFooter>
    </form>
  );
}

function KindStep({
  kind,
  onChange,
}: {
  kind: PostKind | null;
  onChange: (kind: PostKind) => void;
}) {
  const id = useId();
  return (
    <RadioGroup
      aria-label={m.trade_composer_kind_label()}
      value={kind ?? ""}
      onValueChange={(next) => {
        const picked = KINDS.find((item) => item === next);
        if (picked) onChange(picked);
      }}
      className="gap-2"
    >
      {KINDS.map((item) => (
        <RadioPrimitive.Root
          key={item}
          value={item}
          aria-describedby={`${id}-${item}`}
          className={cn(
            "focus-visible:ring-ring focus-visible:ring-offset-background hover:bg-muted flex w-full cursor-pointer flex-col items-start gap-1 rounded-lg border p-3.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
            "data-checked:border-accent-solid data-checked:bg-accent",
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            {KIND_LABEL[item]()}
            <TagBadge tag={KIND_TAG[item]} />
          </span>
          <span id={`${id}-${item}`} className="text-muted-foreground text-xs text-pretty">
            {KIND_DESC[item]()}
          </span>
        </RadioPrimitive.Root>
      ))}
    </RadioGroup>
  );
}

const NONE = "__none__";

function blockText(block: RowBlock) {
  return block.reason === "needs_profile"
    ? m.trade_composer_needs_profile()
    : IN_POST[block.kind]();
}

type Prompt = { partner: string; onUnpair: () => void; onPickAnother: () => void };

function ListSection({
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
  const candidates = lists.filter((list) => list.listTypeNew === slot);

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
            const partner = partnerOf(lists, list);
            const note = block
              ? blockText(block)
              : partner
                ? m.trade_paired_with({ name: partner.name })
                : null;
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
        {kind === "buy"
          ? m.trade_composer_unpair_buy({ name: prompt.partner })
          : m.trade_composer_unpair_swap({ name: prompt.partner })}
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

function AlsoPay({
  checked,
  disabled,
  onChange,
}: {
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
        <span className="text-sm font-medium">{m.trade_composer_also_pay()}</span>
        <span id={`${id}-hint`} className="text-muted-foreground text-xs text-pretty">
          {disabled ? m.trade_composer_also_pay_needs_want() : m.trade_composer_also_pay_hint()}
        </span>
      </span>
    </Label>
  );
}

type Plan = Extract<ReturnType<typeof planPost>, { ok: true }>;

/** Names the lists posting will unpair, so the unpair the viewer chose stays in sight. */
function UnpairedNote({
  lists,
  plan,
  picked,
}: {
  lists: PlanList[];
  plan: Plan;
  picked: { have: string | null; want: string | null; sale: string | null };
}) {
  const pickedSlugs = [picked.have, picked.want, picked.sale];
  const names = plan.unlink
    .map((id) => lists.find((list) => list.id === id))
    .filter((list) => list !== undefined && !pickedSlugs.includes(list.slug))
    .map((list) => list!.name);
  if (names.length === 0) return null;
  return (
    <p className="text-muted-foreground text-xs text-pretty">
      {m.trade_composer_unpaired({ name: names.join(", ") })}
    </p>
  );
}

function Preview({
  kind,
  have,
  want,
  sale,
  alsoPay,
}: {
  kind: PostKind;
  have: boolean;
  want: boolean;
  sale: boolean;
  alsoPay: boolean;
}) {
  const tags = choiceTags({ kind, have, want, sale, alsoPay });
  const lines =
    kind === "sell"
      ? [m.trade_composer_match_sell()]
      : kind === "buy"
        ? [m.trade_composer_match_buy()]
        : [
            have && want
              ? m.trade_composer_match_both()
              : have
                ? m.trade_composer_match_have()
                : want
                  ? m.trade_composer_match_want()
                  : m.trade_composer_pick_list(),
            ...(want && alsoPay ? [m.trade_composer_match_also_pay()] : []),
          ];
  return (
    <div className="bg-muted/40 flex flex-col gap-1.5 rounded-lg border px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">{m.trade_composer_shows_as()}</span>
        {(tags.length > 0 ? tags : [KIND_TAG[kind]]).map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>
      {/* polite, so the match line reads out as the picks change it */}
      <p aria-live="polite" className="text-sm text-pretty">
        {lines.join(" ")}
      </p>
    </div>
  );
}
