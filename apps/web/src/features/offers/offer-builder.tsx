import { LinkIcon, PlusIcon, WarningIcon, XIcon } from "@phosphor-icons/react";
import {
  type CandidateItem,
  OFFER_NOTE_MAX_LENGTH,
  OFFER_SIDE_LIMIT,
  type TopupPayer,
} from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useId, useState } from "react";

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
import { Label } from "@/components/ui/label";
import { NumberField, NumberFieldGroup, NumberFieldInput } from "@/components/ui/number-field";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { fetchNewer, invalidateChatLists } from "@/features/chat/queries";
import { CollectionLabel } from "@/features/objekt/objekt-label";
import { currencyName, formatCurrency, useCurrency } from "@/features/settings/use-currency";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import {
  itemLabel,
  itemName,
  offerNo,
  type OfferRefusalInfo,
  offerRefusalOf,
  offerRefusalText,
} from "./format";
import { OfferThumb } from "./offer-item";
import {
  blockedReason,
  CandidateTile,
  type OfferPick,
  OfferPicker,
  type OfferSide,
  pickKey,
  toPick,
} from "./offer-picker";
import {
  invalidateOfferLists,
  myCopyOptions,
  type OfferAddress,
  suggestOptions,
  theirCandidatesOptions,
} from "./queries";
import { SegmentedChoice } from "./segmented-choice";

type Collections = Readonly<Record<string, ValidObjekt | undefined>>;

type TopupDraft = { amount: number; currency: string; payer: TopupPayer };

type OfferPrefill = {
  give?: OfferPick[];
  get?: OfferPick[];
  topup?: TopupDraft;
  note?: string;
  collections?: Collections;
};

export type OfferRequest = {
  to: OfferAddress;
  /** the partner, as the title names them */
  name: string;
  counter?: boolean;
  prefill?: OfferPrefill;
  /** prefills with the For you overlap with this partner, read through `offer.suggest` */
  suggestFor?: string;
  /** a list of theirs whose entries are laid out under You get, ready to add */
  focusList?: string;
};

/** How many of the focused list's entries show under You get before the picker is needed. */
const FOCUS_LIMIT = 8;

function OfferBuilder({
  request,
  open,
  onOpenChange,
}: {
  request: OfferRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* below `sm` the sheet sits in an auto-height grid row, so `h-full` would shrink to its
          content: its height is set outright, under the viewport's top inset */}
      <DialogPopup className="max-w-3xl max-sm:h-[calc(100dvh-(--spacing(12)))]">
        {request ? <BuilderLoader request={request} onDone={() => onOpenChange(false)} /> : null}
      </DialogPopup>
    </Dialog>
  );
}

/** One builder per surface; `open` replaces whatever it was last opened with. */
export function useOfferBuilder() {
  const [request, setRequest] = useState<OfferRequest | null>(null);
  const [open, setOpen] = useState(false);
  return {
    open: (next: OfferRequest) => {
      setRequest(next);
      setOpen(true);
    },
    element: <OfferBuilder request={request} open={open} onOpenChange={setOpen} />,
  };
}

function BuilderLoader({ request, onDone }: { request: OfferRequest; onDone: () => void }) {
  const suggest = useQuery({
    ...suggestOptions(request.suggestFor ?? ""),
    enabled: request.suggestFor !== undefined,
  });

  if (request.suggestFor !== undefined && suggest.isPending) {
    return (
      <>
        <BuilderHeader request={request} />
        <div className="grid gap-6 px-6 pb-6 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </>
    );
  }

  const prefill: OfferPrefill | undefined = suggest.data
    ? {
        give: suggest.data.give.map(toPick),
        get: suggest.data.get.map(toPick),
        collections: suggest.data.collections,
      }
    : request.prefill;

  return (
    <BuilderForm
      request={request}
      prefill={prefill}
      suggestFailed={suggest.isError}
      onDone={onDone}
    />
  );
}

function BuilderHeader({ request }: { request: OfferRequest }) {
  return (
    <DialogHeader>
      <DialogTitle className="font-display">
        {request.counter
          ? m.offer_builder_counter_title({ name: request.name })
          : m.offer_builder_title({ name: request.name })}
      </DialogTitle>
      <DialogDescription>{m.offer_builder_description()}</DialogDescription>
    </DialogHeader>
  );
}

function BuilderForm({
  request,
  prefill,
  suggestFailed,
  onDone,
}: {
  request: OfferRequest;
  prefill: OfferPrefill | undefined;
  suggestFailed: boolean;
  onDone: () => void;
}) {
  const { to, name } = request;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currency: preferred } = useCurrency();

  const [give, setGive] = useState<OfferPick[]>(prefill?.give ?? []);
  const [get, setGet] = useState<OfferPick[]>(prefill?.get ?? []);
  const [seen, setSeen] = useState<Collections>(prefill?.collections ?? {});
  const [topupOn, setTopupOn] = useState(prefill?.topup !== undefined);
  const [amount, setAmount] = useState<number | null>(prefill?.topup?.amount ?? null);
  const [currency, setCurrency] = useState(prefill?.topup?.currency ?? preferred);
  const [payer, setPayer] = useState<TopupPayer>(prefill?.topup?.payer ?? "from");
  const [note, setNote] = useState(prefill?.note ?? "");
  const [picking, setPicking] = useState<OfferSide | null>(null);
  const [error, setError] = useState<{ text: string; remove: boolean; link: boolean } | null>(null);
  const [refused, setRefused] = useState<ReadonlySet<string>>(new Set());
  const noteId = useId();
  const errorId = useId();
  const hintId = useId();

  const theirs = useQuery(theirCandidatesOptions(to));
  const theirFlags = new Map((theirs.data?.items ?? []).map((item) => [pickKey(item), item]));
  const collections: Collections = { ...theirs.data?.collections, ...seen };
  const flagsOf = (pick: OfferPick) => {
    const live = theirFlags.get(pick.key);
    return pick.flags ?? (live ? toPick(live).flags : null);
  };

  // a counter's any-copy asks: each takes one free copy of the viewer's own, when there is one
  const asks = give.filter((pick) => pick.objektId === null);
  const copies = useQueries({
    queries: asks.map((pick) => myCopyOptions(to, collections[pick.collectionSlug])),
  });
  const taken = new Set(give.flatMap((pick) => (pick.objektId ? [pick.objektId] : [])));
  const resolved = new Map<string, OfferPick>();
  for (const [i, ask] of asks.entries()) {
    const data = copies[i]?.data;
    const copy = [...(data?.suggested ?? []), ...(data?.items ?? [])].find(
      (item) =>
        item.collectionSlug === ask.collectionSlug &&
        item.objektId !== null &&
        !taken.has(item.objektId) &&
        blockedReason(item) === null,
    );
    if (!copy?.objektId) continue;
    taken.add(copy.objektId);
    resolved.set(ask.key, { ...toPick(copy), replaces: ask.key });
  }
  const giveShown = give.map((pick) => resolved.get(pick.key) ?? pick);

  const reasonOf = (side: OfferSide, pick: OfferPick) => {
    if (side === "give" && pick.objektId === null) {
      return m.offer_flag_pick_copy({ name: itemName(pick, collections) });
    }
    // only what their lists offer can be asked for, bar what the countered offer gave
    if (side === "get" && theirs.data && !pick.kept && !theirFlags.has(pick.key)) {
      return m.offer_flag_not_listed();
    }
    return blockedReason(flagsOf(pick));
  };

  const focus =
    request.focusList === undefined
      ? []
      : (theirs.data?.items ?? [])
          .filter((item) => item.listSlug === request.focusList && blockedReason(item) === null)
          .slice(0, FOCUS_LIMIT);

  const noteLength = Array.from(note.trim()).length;
  const blocked =
    giveShown.some((pick) => reasonOf("give", pick) !== null) ||
    get.some((pick) => reasonOf("get", pick) !== null);
  const overLimit = giveShown.length > OFFER_SIDE_LIMIT || get.length > OFFER_SIDE_LIMIT;
  const topupValid = !topupOn || (amount !== null && amount > 0 && currency !== "");
  const empty = give.length + get.length === 0;

  const create = useMutation(
    orpc.offer.create.mutationOptions({
      onSuccess: async ({ conversationId }) => {
        onDone();
        await Promise.all([
          invalidateChatLists(queryClient),
          invalidateOfferLists(queryClient),
          fetchNewer(queryClient, conversationId),
        ]);
        if (!("conversationId" in to)) {
          void navigate({ to: "/messages/$id", params: { id: String(conversationId) } });
        }
      },
      onError: (failure) => {
        const refusal = offerRefusalOf(failure);
        if (!refusal) {
          setError({ text: m.offer_send_error(), remove: false, link: false });
          return;
        }
        const keys = new Set([
          ...refusal.objektIds,
          ...refusal.collectionSlugs.map((slug) => `any:${slug}`),
        ]);
        const named = [...giveShown, ...get]
          .filter((pick) => keys.has(pick.key))
          .map((pick) => itemLabel(pick, collections))
          .join(", ");
        setRefused(keys);
        const text =
          offerRefusalText(refusal, named || m.offer_refused_some()) ?? m.offer_send_error();
        // here the way out is taking the named objekts out of the offer
        setError({ text, remove: named !== "", link: refusal.reason === "no_address" });
      },
    }),
  );

  const send = () => {
    if (empty || blocked || overLimit || !topupValid || noteLength > OFFER_NOTE_MAX_LENGTH) return;
    setError(null);
    setRefused(new Set());
    create.mutate({
      ...to,
      give: giveShown.flatMap((pick) =>
        pick.objektId ? [{ collectionSlug: pick.collectionSlug, objektId: pick.objektId }] : [],
      ),
      get: get.map((pick) => ({
        collectionSlug: pick.collectionSlug,
        objektId: pick.objektId ?? undefined,
        listSlug: pick.listSlug ?? undefined,
      })),
      topup: topupOn && amount !== null ? { amount, currency, payer } : undefined,
      note: note.trim() === "" ? undefined : note,
    });
  };

  const sides = { give: [give, setGive], get: [get, setGet] } as const;

  const addFocused = (item: CandidateItem) => {
    const key = pickKey(item);
    setGet((current) =>
      current.some((pick) => pick.key === key) || current.length >= OFFER_SIDE_LIMIT
        ? current
        : [...current, toPick(item)],
    );
  };

  // a target the sender may not reach is refused before anything can be picked
  const upFront = offerRefusalOf(theirs.error);
  if (upFront) return <BuilderRefused request={request} refusal={upFront} onDone={onDone} />;

  return (
    <>
      <BuilderHeader request={request} />
      <DialogPanel className="flex flex-col gap-6">
        {suggestFailed ? (
          <p className="text-muted-foreground text-sm text-pretty">{m.offer_suggest_error()}</p>
        ) : null}
        <div className="grid min-w-0 gap-6 sm:grid-cols-2">
          {(["give", "get"] as const).map((side) => {
            const [picks, setPicks] = sides[side];
            return (
              <SideColumn
                key={side}
                side={side}
                name={name}
                picks={side === "give" ? giveShown : picks}
                collections={collections}
                flagsOf={flagsOf}
                reasonOf={(pick) => reasonOf(side, pick)}
                refused={refused}
                onAdd={() => setPicking(side)}
                onRemove={(key) => setPicks(picks.filter((pick) => pick.key !== key))}
              >
                {side !== "get" || request.focusList === undefined ? null : theirs.isPending ? (
                  <FocusStripSkeleton />
                ) : focus.some((item) => !get.some((p) => p.key === pickKey(item))) ? (
                  <FocusStrip
                    items={focus.filter((item) => !get.some((p) => p.key === pickKey(item)))}
                    collections={collections}
                    full={get.length >= OFFER_SIDE_LIMIT}
                    onAdd={addFocused}
                  />
                ) : null}
              </SideColumn>
            );
          })}
        </div>

        <Topup
          on={topupOn}
          onToggle={setTopupOn}
          amount={amount}
          onAmount={setAmount}
          currency={currency}
          onCurrency={setCurrency}
          payer={payer}
          onPayer={setPayer}
          name={name}
        />

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={noteId}>{m.offer_note_label()}</Label>
          <Textarea
            id={noteId}
            value={note}
            rows={2}
            aria-invalid={noteLength > OFFER_NOTE_MAX_LENGTH || undefined}
            onChange={(event) => setNote(event.target.value)}
            placeholder={m.offer_note_placeholder()}
          />
          <p
            className={cn(
              "self-end font-mono text-xs tabular-nums",
              noteLength > OFFER_NOTE_MAX_LENGTH
                ? "text-destructive-foreground"
                : "text-muted-foreground",
            )}
          >
            {m.chat_counter({
              count: noteLength.toLocaleString(),
              max: OFFER_NOTE_MAX_LENGTH.toLocaleString(),
            })}
          </p>
        </div>

        <div id={errorId} role="alert" className="empty:hidden">
          {error ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-destructive-foreground text-sm text-pretty">
                {error.text}
                {error.remove ? (
                  <span className="block">{m.offer_refused_remove_hint()}</span>
                ) : null}
              </p>
              {error.link ? (
                <Button variant="outline" size="sm" render={<Link to="/link" />} onClick={onDone}>
                  <LinkIcon />
                  {m.link_link_cosmo()}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogPanel>
      <DialogFooter className="sm:items-center">
        <p id={hintId} className="text-muted-foreground text-xs text-pretty sm:me-auto">
          {empty
            ? m.offer_builder_empty_hint()
            : overLimit
              ? m.offer_refused_too_many({ max: OFFER_SIDE_LIMIT })
              : blocked
                ? m.offer_builder_blocked_hint()
                : m.offer_builder_expiry()}
        </p>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button
          disabled={
            empty || blocked || overLimit || !topupValid || noteLength > OFFER_NOTE_MAX_LENGTH
          }
          loading={create.isPending}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          onClick={send}
        >
          {request.counter ? m.offer_send_counter() : m.offer_send()}
        </Button>
      </DialogFooter>

      {picking ? (
        <OfferPicker
          open
          onOpenChange={(next) => {
            if (!next) setPicking(null);
          }}
          side={picking}
          to={to}
          name={name}
          picked={sides[picking][0]}
          onDone={(picks, found) => {
            sides[picking][1](picks);
            setSeen((current) => ({ ...current, ...found }));
            setPicking(null);
          }}
        />
      ) : null}
    </>
  );
}

/** Reads like a refused Message: nothing can be sent, so the only way out is Close. */
function BuilderRefused({
  request,
  refusal,
  onDone,
}: {
  request: OfferRequest;
  refusal: OfferRefusalInfo;
  onDone: () => void;
}) {
  return (
    <>
      <BuilderHeader request={request} />
      <DialogPanel>
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-pretty">
            {offerRefusalText(refusal, m.offer_refused_some()) ?? m.offer_send_error()}
          </p>
          {refusal.reason === "no_address" ? (
            <Button variant="outline" size="sm" render={<Link to="/link" />} onClick={onDone}>
              <LinkIcon />
              {m.link_link_cosmo()}
            </Button>
          ) : null}
        </div>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
      </DialogFooter>
    </>
  );
}

function SideColumn({
  side,
  name,
  picks,
  collections,
  flagsOf,
  reasonOf,
  refused,
  onAdd,
  onRemove,
  children,
}: {
  side: OfferSide;
  name: string;
  picks: OfferPick[];
  collections: Collections;
  flagsOf: (pick: OfferPick) => OfferPick["flags"];
  reasonOf: (pick: OfferPick) => string | null;
  refused: ReadonlySet<string>;
  onAdd: () => void;
  onRemove: (key: string) => void;
  children?: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2">
      <h3 id={headingId} className="flex items-baseline gap-2 text-sm font-medium">
        {side === "give" ? m.offer_side_give() : m.offer_side_get()}
        <span className="text-muted-foreground font-mono text-xs font-normal tabular-nums">
          {m.offer_side_count({ count: picks.length, max: OFFER_SIDE_LIMIT })}
        </span>
      </h3>
      {picks.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {picks.map((pick) => {
            const flags = flagsOf(pick);
            const blocked = reasonOf(pick);
            const label = itemLabel(pick, collections);
            return (
              <li
                key={pick.key}
                className={cn(
                  "flex min-w-0 items-center gap-3 rounded-lg border p-1.5 pe-1",
                  (blocked || refused.has(pick.key)) && "border-destructive/40",
                )}
              >
                <OfferThumb
                  slug={pick.collectionSlug}
                  collection={collections[pick.collectionSlug]}
                  className="w-9"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                  <span className="font-medium break-words">
                    <CollectionLabel
                      slug={pick.collectionSlug}
                      collection={collections[pick.collectionSlug]}
                      serial={pick.objektId === null ? null : pick.serial}
                    />
                  </span>
                  {pick.objektId === null && flags?.copies != null ? (
                    <span className="text-muted-foreground text-xs">
                      {m.offer_any_copy_count({ count: flags.copies })}
                    </span>
                  ) : null}
                  {blocked ? (
                    <span className="text-destructive-foreground text-xs">{blocked}</span>
                  ) : refused.has(pick.key) ? (
                    <span className="text-destructive-foreground text-xs">
                      {m.offer_flag_refused()}
                    </span>
                  ) : flags && flags.inOpenOffer.length > 0 ? (
                    <span className="text-warning-foreground text-xs">
                      {m.offer_flag_in_open_offer({
                        offers: flags.inOpenOffer.map(offerNo).join(", "),
                      })}
                    </span>
                  ) : null}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={m.offer_remove_item({ name: label })}
                  onClick={() => onRemove(pick.replaces ?? pick.key)}
                  className="shrink-0"
                >
                  <XIcon />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground flex min-h-20 items-center rounded-lg border border-dashed px-3 py-4 text-sm text-pretty">
          {side === "give" ? m.offer_side_give_empty() : m.offer_side_get_empty()}
        </p>
      )}
      {children}
      <Button variant="outline" size="sm" className="self-start" onClick={onAdd}>
        <PlusIcon />
        {side === "give" ? m.offer_add_mine() : m.offer_add_theirs({ name })}
      </Button>
    </section>
  );
}

function FocusStrip({
  items,
  collections,
  full,
  onAdd,
}: {
  items: CandidateItem[];
  collections: Collections;
  full: boolean;
  onAdd: (item: CandidateItem) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">{m.offer_focus_hint()}</p>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <li key={pickKey(item)} className="min-w-0">
            <CandidateTile
              item={item}
              collection={collections[item.collectionSlug]}
              selected={false}
              full={full}
              onToggle={() => onAdd(item)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The strip's shape while their lists load, so the dialog does not grow under the reader. */
function FocusStripSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">{m.offer_focus_hint()}</p>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-1">
            <Skeleton className="aspect-photocard rounded-photocard w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Topup({
  on,
  onToggle,
  amount,
  onAmount,
  currency,
  onCurrency,
  payer,
  onPayer,
  name,
}: {
  on: boolean;
  onToggle: (on: boolean) => void;
  amount: number | null;
  onAmount: (amount: number | null) => void;
  currency: string;
  onCurrency: (currency: string) => void;
  payer: TopupPayer;
  onPayer: (payer: TopupPayer) => void;
  name: string;
}) {
  const { codes } = useCurrency();
  const amountId = useId();
  const currencyId = useId();
  const headingId = useId();
  // the chosen code stays selectable before the rates answer
  const options = codes.includes(currency) ? codes : [...codes, currency].toSorted();

  if (!on) {
    return (
      <Button variant="ghost" size="sm" className="self-start" onClick={() => onToggle(true)}>
        <PlusIcon />
        {m.offer_topup_add()}
      </Button>
    );
  }

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-sm font-medium">
          {m.offer_topup_title()}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => onToggle(false)}>
          <XIcon />
          {m.offer_topup_remove()}
        </Button>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,7rem)] gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,8rem)_auto]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={amountId}>{m.offer_topup_amount()}</Label>
          <NumberField
            id={amountId}
            value={amount}
            onValueChange={onAmount}
            min={0}
            format={{ maximumFractionDigits: 2 }}
          >
            <NumberFieldGroup>
              <NumberFieldInput className="text-start tabular-nums" />
            </NumberFieldGroup>
          </NumberField>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={currencyId}>{m.offer_topup_currency()}</Label>
          <Select
            value={currency}
            onValueChange={(v: string | null) => v !== null && onCurrency(v)}
          >
            <SelectTrigger id={currencyId} className="min-w-0">
              <SelectValue>{(v: string) => <span className="font-mono">{v}</span>}</SelectValue>
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false} className="max-h-72">
              {options.map((code) => (
                <SelectItem key={code} value={code}>
                  <span className="font-mono">{code}</span>
                  <span className="text-muted-foreground ml-2">{currencyName(code)}</span>
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
        <SegmentedChoice
          label={m.offer_topup_payer()}
          options={[
            { value: "from", label: m.offer_topup_payer_you() },
            { value: "to", label: m.offer_topup_payer_them({ name }) },
          ]}
          value={payer}
          onChange={onPayer}
          className="col-span-full self-end sm:col-span-1"
        />
      </div>
      <p className="text-warning-foreground flex items-start gap-1.5 text-sm text-pretty">
        <WarningIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
        <span>
          {amount !== null && amount > 0
            ? payer === "from"
              ? m.offer_topup_you_pay({ amount: formatCurrency(amount, currency) })
              : m.offer_topup_they_pay({ amount: formatCurrency(amount, currency) })
            : m.offer_topup_unverified()}
        </span>
      </p>
    </section>
  );
}
