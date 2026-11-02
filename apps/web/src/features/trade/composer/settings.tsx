import { PlusIcon } from "@phosphor-icons/react";
import {
  type PlanList,
  type PostKind,
  type PostPlan,
  POST_KINDS,
  keepsPair,
  partnerOf,
  rowBlock,
} from "@repo/api/schemas/trade-post";
import { Link } from "@tanstack/react-router";
import { type Dispatch, type RefObject, type SetStateAction, useId, useRef, useState } from "react";

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
import { useCreateList } from "@/features/list/actions";
import { CreateListDialog } from "@/features/list/create-list-dialog";
import { EMPTY_DRAFT, NONE } from "@/features/list/list-draft";
import { useUserProfiles } from "@/features/user/hooks";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import {
  type Choice,
  type PostInput,
  choiceForKind,
  otherSlot,
  pairedPartner,
  pickList,
  withAlsoSwap,
} from "../composer-choice";
import { OptionCheck, UnpairPrompt, UnpairedNote } from "../composer-lists";
import {
  KIND_DESC,
  KIND_LABEL,
  KIND_TAG,
  rowNote,
  SLOT_HEADING,
  type Slot,
} from "../post-kind-text";
import { TagBadge } from "../tag-label";

/** What the post is for, its lists and its options. Post sits apart, in `PostButton`. */
export function ComposerSettings({
  lists,
  choice,
  setChoice,
  request,
  plan,
  replaces,
  className,
}: {
  lists: PlanList[];
  choice: Choice;
  setChoice: Dispatch<SetStateAction<Choice>>;
  /** null until a kind is picked */
  request: PostInput | null;
  plan: PostPlan | null;
  replaces: string | null;
  className?: string;
}) {
  const kind = choice.kind;
  const pick = (slot: Slot, slug: string | null) => {
    if (kind) setChoice((prev) => pickList(lists, prev, kind, slot, slug, replaces));
  };
  const hasProfile = useUserProfiles().length > 0;
  // the slot outlives a close, so the dialog keeps its type while it animates out
  const [newList, setNewList] = useState<{ slot: Slot; open: boolean }>({
    slot: "have",
    open: false,
  });
  const closeNewList = () => setNewList((prev) => ({ ...prev, open: false }));
  // the item that opened the dialog is gone with its popup, so focus goes back to the dropdown
  const newListOpener = useRef<HTMLElement | null>(null);
  const bindSlot = newList.slot === "want" ? "have" : newList.slot;

  const side = (slot: Slot) => {
    if (!kind || !plan) return null;
    const partner = pairedPartner(plan, choice[slot], lists);
    const otherPicked = keepsPair(kind, choice.alsoSwap) && choice[otherSlot(kind, slot)] !== null;
    return (
      <ListSelect
        key={slot}
        slot={slot}
        kind={kind}
        optional={kind === "swap" || slot === "want"}
        lists={lists}
        value={choice[slot]}
        otherPicked={otherPicked}
        replaces={replaces}
        needsProfile={slot !== "want" && !hasProfile}
        onNew={(trigger) => {
          newListOpener.current = trigger;
          setNewList({ slot, open: true });
        }}
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
      />
    );
  };

  const alsoPayCheck = request ? (
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
  ) : null;

  return (
    <div className={cn("flex min-w-0 flex-col gap-5", className)}>
      <KindSegment
        kind={kind}
        onChange={(next) => setChoice((prev) => choiceForKind(prev, next))}
      />
      {kind === "swap" ? (
        <>
          {side("have")}
          {side("want")}
          {alsoPayCheck}
        </>
      ) : kind === "sell" ? (
        <>
          {side("sale")}
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
              {side("want")}
              {alsoPayCheck}
            </>
          ) : null}
        </>
      ) : kind === "buy" ? (
        side("want")
      ) : null}
      {plan?.ok && request ? <UnpairedNote lists={lists} plan={plan} picked={request} /> : null}
      <CreateListDialog
        open={newList.open && newList.slot !== "want"}
        onOpenChange={(open) => {
          if (!open) closeNewList();
        }}
        initial={{ ...EMPTY_DRAFT, listType: bindSlot, isProfileBind: true }}
        lockType
        onCreated={(slug) => pick(bindSlot, slug)}
        finalFocus={newListOpener}
      />
      <NewWantListDialog
        open={newList.open && newList.slot === "want"}
        onOpenChange={(open) => {
          if (!open) closeNewList();
        }}
        onCreated={(slug) => pick("want", slug)}
        finalFocus={newListOpener}
      />
    </div>
  );
}

/** Swap, Sell or Buy as one segmented choice, with the picked one's description beneath. */
function KindSegment({
  kind,
  onChange,
}: {
  kind: PostKind | null;
  onChange: (kind: PostKind) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="text-sm font-medium">
        {m.trade_composer_kind_label()}
      </span>
      <RadioGroup
        aria-labelledby={`${id}-label`}
        aria-describedby={kind ? `${id}-desc` : undefined}
        value={kind ?? ""}
        onValueChange={(next) => {
          const picked = POST_KINDS.find((item) => item === next);
          if (picked) onChange(picked);
        }}
        className="grid grid-cols-3 gap-1.5"
      >
        {POST_KINDS.map((item) => (
          <RadioPrimitive.Root
            key={item}
            value={item}
            className={cn(
              "focus-visible:ring-ring focus-visible:ring-offset-background hover:bg-muted flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              // the light wash at full strength drops the tag inside it under 4.5:1
              "data-checked:border-accent-solid data-checked:bg-accent/60 dark:data-checked:bg-accent",
            )}
          >
            <span className="text-sm font-medium">{KIND_LABEL[item]()}</span>
            <TagBadge tag={KIND_TAG[item]} />
          </RadioPrimitive.Root>
        ))}
      </RadioGroup>
      <p id={`${id}-desc`} className="text-muted-foreground min-h-8 text-xs text-pretty">
        {kind ? KIND_DESC[kind]() : m.trade_composer_kind_prompt()}
      </p>
    </div>
  );
}

type Prompt = { partner: string; onUnpair: () => void; onPickAnother: () => void };

/** the dropdown's last item, beside `NONE` */
const NEW = "__new__";

const NEW_LIST_LABEL: Record<Slot, () => string> = {
  have: m.trade_composer_new_list_have,
  sale: m.trade_composer_new_list_sale,
  want: m.trade_composer_new_list_want,
};

/** One side's list as a dropdown: a list the post can't take stays in it, disabled, with why. */
function ListSelect({
  slot,
  kind,
  optional,
  lists,
  value,
  otherPicked,
  replaces,
  needsProfile,
  onNew,
  prompt,
  onPick,
}: {
  slot: Slot;
  kind: PostKind;
  /** a Swap post may leave either side out, and a Sell post its want list */
  optional: boolean;
  lists: PlanList[];
  value: string | null;
  /** the other side is picked, so a list no longer brings its partner along */
  otherPicked: boolean;
  replaces: string | null;
  /** a have or sale list can't be made without a linked Cosmo profile */
  needsProfile: boolean;
  onNew: (trigger: HTMLElement | null) => void;
  prompt: Prompt | null;
  onPick: (slug: string | null) => void;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const candidates = lists.filter((list) => list.listType === slot);
  const rows = candidates.map((list) => {
    const block = rowBlock(lists, list, kind, replaces, otherPicked);
    return { list, block, note: rowNote(block, partnerOf(lists, list)?.name ?? null) };
  });
  const picked = rows.find((row) => row.list.slug === value);
  const showPrompt = prompt !== null && picked !== undefined;
  const note = showPrompt ? null : (picked?.note ?? null);
  const describedBy =
    [
      showPrompt ? `${id}-prompt` : note ? `${id}-note` : null,
      needsProfile ? `${id}-profile` : null,
    ]
      .filter((part) => part !== null)
      .join(" ") || undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{SLOT_HEADING[slot]()}</Label>
      <Select
        value={value ?? NONE}
        onValueChange={(next: string | null) => {
          // New list opens its dialog and leaves the pick as it is
          if (next === NEW) onNew(triggerRef.current);
          else onPick(next === null || next === NONE ? null : next);
        }}
      >
        <SelectTrigger ref={triggerRef} id={id} className="min-w-0" aria-describedby={describedBy}>
          <SelectValue>
            {(next: string) =>
              next === NONE
                ? optional
                  ? m.trade_composer_no_list()
                  : m.trade_composer_side_pick()
                : (picked?.list.name ?? next)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectPopup>
          {optional ? <SelectItem value={NONE}>{m.trade_composer_no_list()}</SelectItem> : null}
          {rows.map(({ list, block, note: rowText }) => (
            <SelectItem key={list.id} value={list.slug} label={list.name} disabled={block !== null}>
              <span className="flex min-w-0 flex-col">
                <span className="break-words">{list.name}</span>
                {rowText ? (
                  <span className="text-muted-foreground text-xs text-pretty">{rowText}</span>
                ) : null}
              </span>
            </SelectItem>
          ))}
          <SelectItem value={NEW} disabled={needsProfile} className="border-t">
            <span className="flex min-w-0 items-center gap-1.5">
              <PlusIcon aria-hidden />
              {NEW_LIST_LABEL[slot]()}
            </span>
          </SelectItem>
        </SelectPopup>
      </Select>
      {needsProfile ? (
        <p id={`${id}-profile`} className="text-muted-foreground text-xs text-pretty">
          {slot === "sale"
            ? m.trade_composer_sale_needs_profile()
            : m.trade_composer_have_needs_profile()}{" "}
          <Link to="/account/profiles" className="text-foreground underline underline-offset-2">
            {m.link_link_cosmo()}
          </Link>
        </p>
      ) : null}
      {note ? (
        <p id={`${id}-note`} className="text-muted-foreground text-xs text-pretty">
          {note}
        </p>
      ) : null}
      {showPrompt ? <UnpairPrompt id={`${id}-prompt`} kind={kind} prompt={prompt} /> : null}
    </div>
  );
}

/** New want list…: a name only, for an empty want list under no profile and off Trade. */
function NewWantListDialog({
  open,
  onOpenChange,
  onCreated,
  finalFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (slug: string) => void;
  finalFocus: RefObject<HTMLElement | null>;
}) {
  // a fresh name on each opening
  const [session, setSession] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(next) => {
        if (!next) setSession((prev) => prev + 1);
      }}
    >
      <DialogPopup className="max-w-md" finalFocus={finalFocus}>
        <NewWantListForm
          key={session}
          onCreated={(slug) => {
            onCreated(slug);
            onOpenChange(false);
          }}
        />
      </DialogPopup>
    </Dialog>
  );
}

function NewWantListForm({ onCreated }: { onCreated: (slug: string) => void }) {
  const id = useId();
  const create = useCreateList();
  const [name, setName] = useState("");
  const trimmed = name.trim();
  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        if (!trimmed) return;
        create.mutate(
          {
            name: trimmed,
            listType: "want",
            isProfileBind: false,
            linkedListId: null,
            profileAddress: null,
            description: null,
            currency: null,
            discoverable: false,
          },
          // runs after the hook's own onSuccess has refetched the viewer's lists
          { onSuccess: ({ slug }) => onCreated(slug) },
        );
      }}
    >
      <DialogHeader>
        <DialogTitle className="font-display">{m.trade_composer_new_want()}</DialogTitle>
        <DialogDescription>{m.trade_composer_new_want_hint()}</DialogDescription>
      </DialogHeader>
      <DialogPanel>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>{m.list_create_name_label()}</Label>
          <Input
            id={id}
            autoFocus
            maxLength={256}
            placeholder={m.list_create_name_placeholder()}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button type="submit" disabled={!trimmed} loading={create.isPending}>
          {m.common_actions_create()}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Post, or Save on Edit post; disabled until the kind's lists are picked. */
export function PostButton({
  editing,
  disabled,
  pending,
  onPost,
  className,
}: {
  editing: boolean;
  disabled: boolean;
  pending: boolean;
  onPost: () => void;
  className?: string;
}) {
  return (
    <Button size="lg" className={className} disabled={disabled} loading={pending} onClick={onPost}>
      {editing ? m.common_actions_save() : m.trade_composer_post()}
    </Button>
  );
}
