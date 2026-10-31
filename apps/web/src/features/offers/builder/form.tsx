import { OFFER_NOTE_MAX_LENGTH, OFFER_SIDE_LIMIT, type TopupPayer } from "@repo/api/schemas/offer";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";

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
import { type Collections, type OfferPick, type OfferSide, pickKey } from "@/features/offers/pick";
import { putBack, takeOut, takeOutAdded, takeOutAll } from "@/features/offers/quantity";
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

import { type NearGroup, nearPayer, withNear } from "../near-picks";
import {
  asksOf,
  holdsDraft as holdsDraftOf,
  offerInput,
  pickEstimated,
  pickFlags,
  pickProblem,
  resolveAsks,
  sendGate,
} from "./draft";
import { addedKeys, matchesLine } from "./matches";
import { MatchesLine, NearLine } from "./matches-line";
import { BuilderRefused, type SendFailure, SendError } from "./refused";
import { SideColumn } from "./side-column";
import { Topup } from "./topup";
import type { AddedMatches, OfferRequest } from "./types";

export function BuilderForm({
  request,
  onDraft,
  onDone,
  region,
  added,
}: {
  request: OfferRequest;
  /** hands over whether the draft holds anything, so closing it can ask first */
  onDraft: (holds: (() => boolean) | null) => void;
  onDone: () => void;
  /** the caller's status region, which the matches line is drawn into */
  region?: HTMLElement | null;
  /** what the matches added when the builder opened */
  added?: AddedMatches;
}) {
  const { to, name, prefill } = request;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currency: preferred } = useCurrency();

  const [give, setGive] = useState<OfferPick[]>(prefill?.give ?? []);
  const [get, setGet] = useState<OfferPick[]>(prefill?.get ?? []);
  const [seen, setSeen] = useState<Collections>(prefill?.collections ?? {});
  // a near sale or buy added at open opens the top-up with its payer, and no amount
  const [topupNear, setTopupNear] = useState(added?.nearTopup ?? null);
  const [topupOn, setTopupOn] = useState(prefill?.topup !== undefined || topupNear !== null);
  const [amount, setAmount] = useState<number | null>(prefill?.topup?.amount ?? null);
  // only a pick is held: the preferred currency reads "USD" until the rates load
  const [chosenCurrency, setCurrency] = useState(prefill?.topup?.currency ?? null);
  const currency = chosenCurrency ?? preferred;
  const [payer, setPayer] = useState<TopupPayer>(
    prefill?.topup?.payer ?? (topupNear ? nearPayer(topupNear.verb) : null) ?? "from",
  );
  // the amount's error waits for a first edit, a blur or a send attempt
  const [topupTouched, setTopupTouched] = useState(false);
  const [note, setNote] = useState(prefill?.note ?? "");
  const [picking, setPicking] = useState<OfferSide | null>(null);
  const [error, setError] = useState<SendFailure | null>(null);
  const [refused, setRefused] = useState<ReadonlySet<string>>(new Set());
  const [nearLeft, setNearLeft] = useState<NearGroup[]>(added?.near ?? []);
  const [nearKeys, setNearKeys] = useState(added?.nearKeys ?? { give: [], get: [] });
  // what Remove matches took out, while Undo can put it back
  const [removed, setRemoved] = useState<{
    give: OfferPick[];
    get: OfferPick[];
    topupNear: typeof topupNear;
  } | null>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
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
  const flagsOf = (pick: OfferPick) => pickFlags(pick, theirFlags);
  const estimatedOf = (pick: OfferPick) => pickEstimated(pick, theirFlags);

  // a counter's any-copy asks: each takes one free copy of the viewer's own, when there is one
  const asks = asksOf(give);
  const copies = useQueries({
    queries: asks.map((pick) => myCopyOptions(to, collections[pick.collectionSlug])),
  });
  const loadingAsks = new Set(asks.filter((_, i) => copies[i]?.isPending).map((pick) => pick.key));
  const giveShown = resolveAsks(
    give,
    copies.map((query) => query.data),
  );

  const reasonOf = (side: OfferSide, pick: OfferPick) =>
    pickProblem(side, pick, {
      get,
      live: theirFlags,
      loaded: theirs.data !== undefined,
      source,
      nameOf: (p) => itemName(p, collections),
    });

  const gate = sendGate({
    give: giveShown,
    get,
    blocked:
      giveShown.some((pick) => reasonOf("give", pick) !== null) ||
      get.some((pick) => reasonOf("get", pick) !== null),
    topup: { on: topupOn, amount, currency },
    note,
  });
  const { noteLength, noteTooLong, topupError } = gate;

  const { give: addedGive, get: addedGet } = addedKeys(added, nearKeys);
  const names = (picks: readonly OfferPick[]) =>
    new Intl.ListFormat(getLocale(), { type: "conjunction" }).format(
      picks.map((pick) => itemName(pick, collections)),
    );
  const addNear = (group: NearGroup) => {
    const preset = nearPayer(group.verb);
    // a pick already on the side stays the sender's own, and a full side takes no more
    const { picks, added: fresh } = withNear(
      group.side === "give" ? give : get,
      group,
      OFFER_SIDE_LIMIT,
    );
    flushSync(() => {
      (group.side === "give" ? setGive : setGet)(picks);
      setNearKeys((keys) => ({
        ...keys,
        [group.side]: [...keys[group.side], ...fresh.map((pick) => pick.key)],
      }));
      setNearLeft((groups) => groups.filter((g) => g !== group));
      if (preset && !topupOn && fresh.length > 0) {
        setTopupOn(true);
        setPayer(preset);
        setAmount(null);
        setTopupTouched(false);
        setTopupNear({ verb: group.verb, picks: fresh });
      }
    });
    // the line and its button are gone: focus stays in the status region
    (removeRef.current ?? undoRef.current)?.focus();
  };
  const topupReason = topupNear
    ? (topupNear.verb === "sell" ? m.offer_topup_near_sell : m.offer_topup_near_buy)({
        name,
        objekts: names(topupNear.picks),
      })
    : undefined;
  const line = matchesLine({ added, nearKeys, give, get, removed });
  const removeMatches = () => {
    const gave = takeOutAdded(give, addedGive);
    const got = takeOutAdded(get, addedGet);
    // a top-up the near picks opened, still with no amount, goes with them
    const presetTopup = topupNear !== null && amount === null ? topupNear : null;
    flushSync(() => {
      setGive(gave.left);
      setGet(got.left);
      setRemoved({ give: gave.taken, get: got.taken, topupNear: presetTopup });
      if (presetTopup) {
        setTopupOn(false);
        setTopupNear(null);
      }
    });
    undoRef.current?.focus();
  };
  const undoRemove = () => {
    if (!removed) return;
    flushSync(() => {
      setGive((current) => putBack(current, removed.give));
      setGet((current) => putBack(current, removed.get));
      if (removed.topupNear && !topupOn) {
        setTopupOn(true);
        setPayer(nearPayer(removed.topupNear.verb) ?? payer);
        setTopupNear(removed.topupNear);
      }
      setRemoved(null);
    });
    removeRef.current?.focus();
  };
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

  // nothing is lost while the send is on its way
  const holdsDraft =
    !create.isPending &&
    holdsDraftOf({ give, get, topup: { on: topupOn, amount, currency, payer }, note }, prefill);

  useEffect(() => {
    onDraft(() => holdsDraft);
    return () => onDraft(null);
  }, [onDraft, holdsDraft]);

  const send = () => {
    if (topupError !== null) setTopupTouched(true);
    if (!gate.canSend) return;
    setError(null);
    setRefused(new Set());
    create.mutate(
      offerInput(to, {
        give: giveShown,
        get,
        topup: { on: topupOn, amount, currency, payer },
        note,
      }),
    );
  };

  const sides = { give: [give, setGive], get: [get, setGet] } as const;
  const shown = { give: giveShown, get };

  // a target the sender may not reach is refused before anything can be picked
  const upFront = offerRefusalOf(theirs.error);
  if (upFront) {
    return <BuilderRefused refusal={upFront} onDone={onDone} />;
  }

  return (
    <>
      {region && (line || nearLeft.length > 0)
        ? createPortal(
            <div className="flex flex-col gap-2">
              {line ? (
                <MatchesLine
                  added={line.added}
                  nearNames={line.nearPicks.length > 0 ? names(line.nearPicks) : null}
                  taken={line.taken}
                  takenNames={line.takenNear ? names(line.takenNear) : null}
                  onRemove={removeMatches}
                  onUndo={undoRemove}
                  removeRef={removeRef}
                  undoRef={undoRef}
                />
              ) : null}
              {nearLeft.map((group) => (
                <NearLine
                  key={`${group.side}:${group.verb}`}
                  group={group}
                  names={names(group.picks)}
                  onAdd={() => addNear(group)}
                />
              ))}
            </div>,
            region,
          )
        : null}
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
            if (!on) setTopupNear(null);
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
          reason={topupReason}
          name={name}
        />

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={noteId}>{m.offer_note_label()}</Label>
          <Textarea
            id={noteId}
            value={note}
            rows={2}
            aria-invalid={noteTooLong || undefined}
            onChange={(event) => setNote(event.target.value)}
            placeholder={m.offer_note_placeholder()}
          />
          <p
            className={cn(
              "self-end text-xs tabular-nums",
              noteTooLong ? "text-destructive-foreground" : "text-muted-foreground",
            )}
          >
            {m.chat_counter({
              count: noteLength.toLocaleString(),
              max: OFFER_NOTE_MAX_LENGTH.toLocaleString(),
            })}
          </p>
        </div>

        <SendingAs onNavigate={onDone} />

        <SendError id={errorId} error={error} onDone={onDone} />
      </DialogPanel>
      <DialogFooter className="sm:items-center">
        <p id={hintId} className="text-muted-foreground text-xs text-pretty sm:me-auto">
          {gate.hint}
        </p>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button
          disabled={gate.disabled}
          // a topup's reason stays clickable, so a send attempt shows it at the field
          aria-disabled={gate.ariaDisabled || undefined}
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
