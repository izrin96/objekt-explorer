import { CopyIcon, PlusIcon } from "@phosphor-icons/react";
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
import { type Dispatch, type SetStateAction, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioPrimitive } from "@/components/ui/radio-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateListDialog } from "@/features/list/create-list-dialog";
import { EMPTY_DRAFT, NONE, isBindable } from "@/features/list/list-draft";
import { TagBadge } from "@/features/list/tag-label";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
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
import { ComposerCopyDialog } from "./copy-list-dialog";

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
  const hasLists = useUserLists().length > 0;
  // the slot outlives a close, so the dialog keeps its type while it animates out
  const [newList, setNewList] = useState<{ slot: Slot; open: boolean }>({
    slot: "have",
    open: false,
  });
  const closeNewList = () => setNewList((prev) => ({ ...prev, open: false }));
  // the item that opened the dialog is gone with its popup, so focus goes back to the dropdown
  const newListOpener = useRef<HTMLElement | null>(null);
  const [copyList, setCopyList] = useState<{ slot: Slot; open: boolean }>({
    slot: "have",
    open: false,
  });
  const copyListOpener = useRef<HTMLElement | null>(null);

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
        onCopy={
          hasLists
            ? (trigger) => {
                copyListOpener.current = trigger;
                setCopyList({ slot, open: true });
              }
            : null
        }
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
        open={newList.open}
        onOpenChange={(open) => {
          if (!open) closeNewList();
        }}
        initial={{
          ...EMPTY_DRAFT,
          listType: newList.slot,
          isProfileBind: isBindable(newList.slot),
        }}
        lockType
        onCreated={(slug) => pick(newList.slot, slug)}
        finalFocus={newListOpener}
      />
      <ComposerCopyDialog
        slot={copyList.slot}
        open={copyList.open}
        onOpenChange={(open) => {
          if (!open) setCopyList((prev) => ({ ...prev, open: false }));
        }}
        onCreated={(slug) => pick(copyList.slot, slug)}
        finalFocus={copyListOpener}
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

/** the dropdown's last items, beside `NONE` */
const NEW = "__new__";
const COPY = "__copy__";

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
  onCopy,
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
  /** null hides Copy a list…, for a viewer with no list to copy */
  onCopy: ((trigger: HTMLElement | null) => void) | null;
  prompt: Prompt | null;
  onPick: (slug: string | null) => void;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const typed = useRef(false);
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
        onValueChange={(next: string | null, details) => {
          // typing on the closed trigger and Base UI's reset of a value it holds no item for yet
          // (a list just made and picked, until the refetched lists render) both report "none";
          // only typing comes from a key, so the reset is the one skipped; typing picks lists only,
          // never the items that open a dialog
          if (details.reason === "none" && (!typed.current || next === NEW || next === COPY)) {
            return;
          }
          // New list and Copy a list open their dialog and leave the pick as it is
          if (next === NEW) onNew(triggerRef.current);
          else if (next === COPY) onCopy?.(triggerRef.current);
          else onPick(next === null || next === NONE ? null : next);
        }}
      >
        <SelectTrigger
          ref={triggerRef}
          id={id}
          className="min-w-0"
          aria-describedby={describedBy}
          onKeyDownCapture={() => {
            typed.current = true;
            // a timeout, not a microtask: one runs between React's capture and bubble listeners
            setTimeout(() => {
              typed.current = false;
            }, 0);
          }}
        >
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
          {optional || rows.length > 0 ? <SelectSeparator /> : null}
          <SelectItem value={NEW} disabled={needsProfile}>
            <span className="flex min-w-0 items-center gap-1.5">
              <PlusIcon aria-hidden />
              {NEW_LIST_LABEL[slot]()}
            </span>
          </SelectItem>
          {onCopy ? (
            <SelectItem value={COPY} disabled={needsProfile}>
              <span className="flex min-w-0 items-center gap-1.5">
                <CopyIcon aria-hidden />
                {m.trade_composer_copy_list()}
              </span>
            </SelectItem>
          ) : null}
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
