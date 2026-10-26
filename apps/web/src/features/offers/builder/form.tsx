import { LinkIcon } from "@phosphor-icons/react";
import {
  OFFER_NOTE_MAX_LENGTH,
  OFFER_SIDE_LIMIT,
  TOPUP_MAX,
  type TopupPayer,
} from "@repo/api/schemas/offer";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter, DialogPanel } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchNewer, invalidateChatLists } from "@/features/chat/queries";
import { SendingAs } from "@/features/link/shown-as";
import { EstimatedSerialNote } from "@/features/offers/estimated-serial-note";
import { itemLabel, itemName } from "@/features/offers/format";
import { type GetSource, sourceOf } from "@/features/offers/get-source";
import { OfferPicker } from "@/features/offers/offer-picker";
import {
  blockedReason,
  type Collections,
  type OfferPick,
  type OfferSide,
  pickKey,
  toPick,
} from "@/features/offers/pick";
import { copiesLeft, countOf, takeOut, takeOutAll, totalOf } from "@/features/offers/quantity";
import {
  invalidateOfferLists,
  myCopyOptions,
  theirCandidatesOptions,
} from "@/features/offers/queries";
import { offerRefusalOf, offerRefusalText, refusedKeys } from "@/features/offers/refusal";
import { useCurrency } from "@/features/settings/use-currency";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { BuilderHeader } from "./header";
import { BuilderRefused } from "./refused";
import { SideColumn } from "./side-column";
import { Topup } from "./topup";
import type { OfferRequest } from "./types";

export function BuilderForm({
  request,
  onDraft,
  onDone,
}: {
  request: OfferRequest;
  /** hands over whether the draft holds anything, so closing it can ask first */
  onDraft: (holds: (() => boolean) | null) => void;
  onDone: () => void;
}) {
  const { to, name, prefill } = request;
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
  // the amount's error waits for a first edit, a blur or a send attempt
  const [topupTouched, setTopupTouched] = useState(false);
  const [note, setNote] = useState(prefill?.note ?? "");
  const [picking, setPicking] = useState<OfferSide | null>(null);
  const [error, setError] = useState<{ text: string; remove: boolean; link: boolean } | null>(null);
  const [refused, setRefused] = useState<ReadonlySet<string>>(new Set());
  const noteId = useId();
  const errorId = useId();
  const hintId = useId();

  const theirs = useQuery(theirCandidatesOptions(to));
  // unknown until the partner's lists have loaded; an error leaves it on lists, which refuse alone
  const source: GetSource | undefined = theirs.isPending ? undefined : sourceOf(theirs.data ?? {});
  const theirFlags = new Map((theirs.data?.items ?? []).map((item) => [pickKey(item), item]));
  const collections: Collections = {
    ...theirs.data?.collections,
    ...seen,
  };
  const flagsOf = (pick: OfferPick) => {
    const live = theirFlags.get(pick.key);
    return pick.flags ?? (live ? toPick(live).flags : null);
  };
  const estimatedOf = (pick: OfferPick) =>
    pick.serialEstimated ?? theirFlags.get(pick.key)?.serialEstimated ?? false;

  // a counter's any-copy asks: each takes one free copy of the viewer's own, when there is one
  const asks = give.filter((pick) => pick.objektId === null);
  const copies = useQueries({
    queries: asks.map((pick) => myCopyOptions(to, collections[pick.collectionSlug])),
  });
  const loadingAsks = new Set(asks.filter((_, i) => copies[i]?.isPending).map((pick) => pick.key));
  const taken = new Set(give.flatMap((pick) => (pick.objektId ? [pick.objektId] : [])));
  const resolved = new Map<string, OfferPick[]>();
  for (const [i, ask] of asks.entries()) {
    const data = copies[i]?.data;
    const found: OfferPick[] = [];
    for (const copy of [...(data?.suggested ?? []), ...(data?.items ?? [])]) {
      if (found.length >= countOf(ask)) break;
      if (
        copy.collectionSlug !== ask.collectionSlug ||
        copy.objektId === null ||
        taken.has(copy.objektId) ||
        blockedReason(copy) !== null
      ) {
        continue;
      }
      taken.add(copy.objektId);
      found.push({ ...toPick(copy), replaces: ask.key });
    }
    if (found.length > 0) resolved.set(ask.key, found);
  }
  // an ask for several copies keeps what it couldn't fill, still waiting for a copy
  const giveShown = give.flatMap((pick) => {
    const found = resolved.get(pick.key);
    if (!found) return [pick];
    const left = countOf(pick) - found.length;
    return left > 0 ? [...found, { ...pick, count: left }] : found;
  });

  const reasonOf = (side: OfferSide, pick: OfferPick) => {
    if (side === "give" && pick.objektId === null) {
      return m.offer_flag_pick_copy({ name: itemName(pick, collections) });
    }
    // only what their lists offer can be asked for, bar what the countered offer gave; with no
    // lists, the collection picker's picks are checked when the offer is sent
    if (
      side === "get" &&
      theirs.data &&
      source !== "collection" &&
      !pick.kept &&
      !theirFlags.has(pick.key)
    ) {
      return m.offer_flag_not_listed();
    }
    // the copies they spare now, which may have dropped since the count was set, less those
    // this offer also asks for by serial
    const spare = theirFlags.get(pick.key)?.copies ?? pick.flags?.copies;
    if (side === "get" && pick.objektId === null && spare != null) {
      const left = copiesLeft(get, pick.collectionSlug, spare);
      if (countOf(pick) > left) return m.offer_flag_too_many({ count: left });
    }
    return blockedReason(flagsOf(pick));
  };

  const noteLength = Array.from(note.trim()).length;
  const blocked =
    giveShown.some((pick) => reasonOf("give", pick) !== null) ||
    get.some((pick) => reasonOf("get", pick) !== null);
  const overLimit = totalOf(giveShown) > OFFER_SIDE_LIMIT || totalOf(get) > OFFER_SIDE_LIMIT;
  const topupError = !topupOn
    ? null
    : amount === null || amount <= 0
      ? m.offer_topup_amount_required()
      : amount > TOPUP_MAX
        ? m.offer_topup_amount_max({ max: TOPUP_MAX.toLocaleString(getLocale()) })
        : null;
  const topupValid = topupError === null && (!topupOn || currency !== "");
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
        const keys = refusedKeys(refusal);
        const named = [...giveShown, ...get]
          .filter((pick) => keys.has(pick.key))
          .map((pick) => itemLabel({ ...pick, serialEstimated: estimatedOf(pick) }, collections))
          .join(", ");
        setRefused(keys);
        const text =
          offerRefusalText(refusal, named || m.offer_refused_some()) ?? m.offer_send_error();
        // here the way out is taking the named objekts out of the offer
        setError({ text, remove: named !== "", link: refusal.reason === "no_address" });
      },
    }),
  );

  // what closing would lose: changes to the prefill, nothing while the send is on its way, and
  // an open top-up with no amount holds nothing
  const sameKeys = (picks: OfferPick[], from: OfferPick[] = []) =>
    picks.length === from.length &&
    picks.every((pick, i) => pick.key === from[i]?.key && countOf(pick) === countOf(from[i]!));
  const holdsDraft =
    !create.isPending &&
    (!sameKeys(give, prefill?.give) ||
      !sameKeys(get, prefill?.get) ||
      (topupOn &&
        amount !== null &&
        (amount !== prefill?.topup?.amount ||
          currency !== prefill.topup.currency ||
          payer !== prefill.topup.payer)) ||
      note.trim() !== (prefill?.note ?? "").trim());

  useEffect(() => {
    onDraft(() => holdsDraft);
    return () => onDraft(null);
  }, [onDraft, holdsDraft]);

  const send = () => {
    if (topupError !== null) setTopupTouched(true);
    if (empty || blocked || overLimit || !topupValid || noteLength > OFFER_NOTE_MAX_LENGTH) return;
    setError(null);
    setRefused(new Set());
    create.mutate({
      ...to,
      give: giveShown.flatMap((pick) =>
        pick.objektId ? [{ collectionSlug: pick.collectionSlug, objektId: pick.objektId }] : [],
      ),
      // an any-copy pick of several copies asks for each one
      get: get.flatMap((pick) =>
        Array.from({ length: countOf(pick) }, () => ({
          collectionSlug: pick.collectionSlug,
          objektId: pick.objektId ?? undefined,
          listSlug: pick.listSlug ?? undefined,
        })),
      ),
      topup: topupOn && amount !== null ? { amount, currency, payer } : undefined,
      note: note.trim() === "" ? undefined : note,
    });
  };

  const sides = { give: [give, setGive], get: [get, setGet] } as const;
  const shown = { give: giveShown, get };

  // a target the sender may not reach is refused before anything can be picked
  const upFront = offerRefusalOf(theirs.error);
  if (upFront) return <BuilderRefused request={request} refusal={upFront} onDone={onDone} />;

  return (
    <>
      <BuilderHeader request={request} />
      <DialogPanel className="flex flex-col gap-6">
        <div className="grid min-w-0 gap-6 sm:grid-cols-2">
          {(["give", "get"] as const).map((side) => {
            const [picks, setPicks] = sides[side];
            return (
              <SideColumn
                key={side}
                side={side}
                name={name}
                picks={shown[side]}
                collections={collections}
                flagsOf={flagsOf}
                estimatedOf={estimatedOf}
                reasonOf={(pick) => reasonOf(side, pick)}
                refused={refused}
                loading={side === "give" ? loadingAsks : undefined}
                source={source}
                onAdd={() => setPicking(side)}
                onRemove={(pick) => setPicks(takeOut(picks, pick))}
                onRemoveMany={(rows) => setPicks(takeOutAll(picks, rows))}
              />
            );
          })}
        </div>
        {[...giveShown, ...get].some(
          (pick) => pick.objektId !== null && pick.serial !== null && estimatedOf(pick),
        ) ? (
          <EstimatedSerialNote />
        ) : null}

        <Topup
          on={topupOn}
          onToggle={(on) => {
            setTopupOn(on);
            setTopupTouched(false);
          }}
          amount={amount}
          onAmount={(next) => {
            setAmount(next);
            setTopupTouched(true);
          }}
          onAmountBlur={() => setTopupTouched(true)}
          currency={currency}
          onCurrency={setCurrency}
          payer={payer}
          onPayer={setPayer}
          error={topupTouched ? topupError : null}
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

        <SendingAs onNavigate={onDone} />

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
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link to="/account/profiles" />}
                  onClick={onDone}
                >
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
                : topupError
                  ? topupError
                  : m.offer_builder_expiry()}
        </p>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button
          disabled={
            empty ||
            blocked ||
            overLimit ||
            (!topupValid && topupError === null) ||
            noteLength > OFFER_NOTE_MAX_LENGTH
          }
          // a topup's reason stays clickable, so a send attempt shows it at the field
          aria-disabled={topupError !== null || undefined}
          className="aria-disabled:opacity-64"
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
          source={source ?? "lists"}
          theirLists={theirs.data?.lists ?? []}
          startList={request.startList}
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
