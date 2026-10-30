import { CardsThreeIcon } from "@phosphor-icons/react";
import {
  type ComposerStart,
  type PostKind,
  keepsPair,
  planPost,
} from "@repo/api/schemas/trade-post";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
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
import { RadioGroup, RadioPrimitive } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useSavePost } from "./actions";
import {
  type Choice,
  SLOTS_OF,
  choiceForKind,
  otherSlot,
  pairedPartner,
  pickList,
  postInput,
  withAlsoSwap,
} from "./composer-choice";
import { ListSection, OptionCheck, Preview, UnpairedNote } from "./composer-lists";
import { KIND_DESC, KIND_LABEL, KIND_TAG, KIND_TITLE, type Slot } from "./post-kind-text";
import { usePlanLists } from "./post-plan";
import { TagBadge } from "./tag-label";

export const NEW_POST: ComposerStart = {
  kind: null,
  have: null,
  want: null,
  sale: null,
  alsoPay: false,
  alsoSwap: false,
  replaces: null,
};

const KINDS: PostKind[] = ["swap", "sell", "buy"];

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

function Composer({ start, onDone }: { start: ComposerStart; onDone: () => void }) {
  const lists = usePlanLists();
  const save = useSavePost();
  const [step, setStep] = useState<"kind" | "lists">(start.kind ? "lists" : "kind");
  const [choice, setChoice] = useState<Choice>({ ...start, unpair: false });
  const editing = start.replaces !== null;
  const tradeLists = lists.filter((list) => list.listType !== "general");

  const setKind = (kind: PostKind) => setChoice((prev) => choiceForKind(prev, kind));

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
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
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
  const request = postInput({ ...choice, kind }, start.replaces);
  const pairs = keepsPair(kind, choice.alsoSwap);
  const plan = planPost(lists, request);
  const alsoPayCheck = (
    <OptionCheck
      label={m.trade_composer_also_pay()}
      hint={
        choice.want === null
          ? m.trade_composer_also_pay_needs_want()
          : m.trade_composer_also_pay_hint()
      }
      checked={request.alsoPay}
      disabled={choice.want === null}
      onChange={(alsoPay) => setChoice((prev) => ({ ...prev, alsoPay }))}
    />
  );

  const pick = (slot: Slot, slug: string | null) =>
    setChoice((prev) => pickList(lists, prev, kind, slot, slug, start.replaces));

  const renderSection = (slot: Slot) => {
    const partner = pairedPartner(plan, choice[slot], lists);
    return (
      <ListSection
        key={slot}
        slot={slot}
        kind={kind}
        optional={kind === "swap" || slot === "want"}
        lists={lists}
        value={choice[slot]}
        otherPicked={pairs && choice[otherSlot(kind, slot)] !== null}
        replaces={start.replaces}
        prompt={
          partner !== null
            ? {
                partner,
                onUnpair: () => setChoice((prev) => ({ ...prev, unpair: true })),
                onPickAnother: () => pick(slot, null),
              }
            : null
        }
        onPick={(slug) => pick(slot, slug)}
        onDone={onDone}
      />
    );
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
        {SLOTS_OF[kind].filter((slot) => !(kind === "sell" && slot === "want")).map(renderSection)}
        {kind === "sell" ? (
          <>
            <p className="text-muted-foreground -mt-3 text-xs text-pretty">
              {m.trade_composer_sale_note()}
            </p>
            <OptionCheck
              label={m.trade_composer_also_swap()}
              hint={
                choice.alsoSwap
                  ? m.trade_composer_also_swap_hint()
                  : m.trade_composer_also_swap_off_hint()
              }
              checked={choice.alsoSwap}
              disabled={false}
              onChange={(alsoSwap) => setChoice((prev) => withAlsoSwap(prev, alsoSwap))}
            />
            {/* what the seller would swap for, once the sale list takes swaps */}
            {choice.alsoSwap ? (
              <>
                {renderSection("want")}
                {alsoPayCheck}
              </>
            ) : null}
          </>
        ) : null}
        {kind === "swap" ? alsoPayCheck : null}
        {plan.ok ? <UnpairedNote lists={lists} plan={plan} picked={request} /> : null}
        <Preview
          kind={kind}
          have={request.have !== null}
          want={request.want !== null}
          sale={request.sale !== null}
          alsoPay={request.alsoPay}
          alsoSwap={request.alsoSwap === true}
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
