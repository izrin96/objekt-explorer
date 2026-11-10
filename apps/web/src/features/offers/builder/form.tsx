import { OFFER_NOTE_MAX_LENGTH, OFFER_SIDE_LIMIT } from "@repo/api/schemas/offer";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SendingAs } from "@/features/link/shown-as";
import { EstimatedSerialNote } from "@/features/offers/estimated-serial-note";
import { itemName } from "@/features/offers/format";
import { type GetSource, sourceOf } from "@/features/offers/get-source";
import { OfferPicker } from "@/features/offers/offer-picker";
import { type Collections, type OfferPick, type OfferSide, pickKey } from "@/features/offers/pick";
import { putBack, takeOut, takeOutAdded, takeOutAll } from "@/features/offers/quantity";
import { myCopyOptions, theirCandidatesOptions } from "@/features/offers/queries";
import { offerRefusalOf } from "@/features/offers/refusal";
import { useCurrency } from "@/features/settings/use-currency";
import { joinList } from "@/lib/text";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { type NearGroup, withNear } from "../near-picks";
import {
  asksOf,
  holdsDraft as holdsDraftOf,
  initialTopup,
  offerInput,
  pickEstimated,
  pickFlags,
  pickProblem,
  resolveAsks,
  resolveGetAsks,
  sendGate,
  toggleTopup,
  topupForNear,
  topupRestored,
  topupValue,
  topupWithoutNear,
  touchTopup,
  type TopupState,
} from "./draft";
import { BuilderBody } from "./layout";
import { addedKeys, matchesLine } from "./matches";
import { MatchesLine, NearLine } from "./matches-line";
import { BuilderRefused, SendError } from "./refused";
import { SideColumn } from "./side-column";
import { Topup } from "./topup";
import type { AddedMatches, OfferRequest } from "./types";
import { useSendOffer } from "./use-send-offer";

export function BuilderForm({
  request,
  onDraft,
  onSent,
  onLeave,
  region,
  added,
}: {
  request: OfferRequest;
  /** hands over whether the draft holds anything, so leaving it can ask first */
  onDraft: (holds: (() => boolean) | null) => void;
  /** the offer is in the conversation, which the caller goes to once `ready` settles */
  onSent: (conversationId: number, ready: Promise<unknown>) => void;
  /** Cancel: leaves the page */
  onLeave: () => void;
  /** the caller's status region above the sides, which the matches line is drawn into */
  region?: HTMLElement | null;
  /** what the matches added when the builder opened */
  added?: AddedMatches;
}) {
  const { to, name, prefill } = request;
  const { currency: preferred } = useCurrency();

  const [give, setGive] = useState<OfferPick[]>(prefill?.give ?? []);
  const [get, setGet] = useState<OfferPick[]>(prefill?.get ?? []);
  const [seen, setSeen] = useState<Collections>(prefill?.collections ?? {});
  const [topup, setTopup] = useState(() => initialTopup(prefill?.topup, added?.nearTopup));
  const topupNow = topupValue(topup, preferred);
  const [note, setNote] = useState(prefill?.note ?? "");
  const [picking, setPicking] = useState<OfferSide | null>(null);
  const [nearLeft, setNearLeft] = useState<NearGroup[]>(added?.near ?? []);
  const [nearKeys, setNearKeys] = useState(added?.nearKeys ?? { give: [], get: [] });
  // what Remove matches took out, while Undo can put it back
  const [removed, setRemoved] = useState<{
    give: OfferPick[];
    get: OfferPick[];
    topupNear: TopupState["near"];
  } | null>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const noteId = useId();
  const counterId = useId();
  const amountRef = useRef<HTMLInputElement>(null);
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
  // a counter's own picks come with no flags: the viewer's copies of those collections carry them
  const unflagged = [
    ...new Set(
      give.flatMap((pick) =>
        pick.objektId !== null && pick.flags === null ? [pick.collectionSlug] : [],
      ),
    ),
  ];
  const ownChecks = useQueries({
    queries: unflagged.map((slug) => myCopyOptions(to, collections[slug])),
  });
  const myFlags = new Map(
    ownChecks.flatMap((query) => query.data?.items ?? []).map((item) => [pickKey(item), item]),
  );
  const flagsOf = (pick: OfferPick) => pickFlags(pick, theirFlags) ?? pickFlags(pick, myFlags);
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

  // an ask for one collection of a list (Make offer for this objekt) takes a copy that list
  // offers, once their lists have loaded
  const getShown = resolveGetAsks(get, theirs.data?.items ?? []);
  const loadingGet = new Set(
    theirs.isPending
      ? get.filter((pick) => pick.objektId === null && pick.listSlug !== null).map((p) => p.key)
      : [],
  );

  const reasonOf = (side: OfferSide, pick: OfferPick) =>
    pickProblem(side, pick, {
      get: getShown,
      live: side === "give" ? myFlags : theirFlags,
      loaded: theirs.data !== undefined,
      source,
      nameOf: (p) => itemName(p, collections),
    });

  const gate = sendGate({
    give: giveShown,
    get: getShown,
    blocked:
      loadingGet.size > 0 ||
      giveShown.some((pick) => reasonOf("give", pick) !== null) ||
      getShown.some((pick) => reasonOf("get", pick) !== null),
    topup: topupNow,
    note,
  });
  const { noteLength, noteTooLong, topupError } = gate;

  const { give: addedGive, get: addedGet } = addedKeys(added, nearKeys);
  const names = (picks: readonly OfferPick[]) =>
    joinList(picks.map((pick) => itemName(pick, collections)));
  const addNear = (group: NearGroup) => {
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
      setTopup(topupForNear(topup, group.verb, fresh));
    });
    // the line and its button are gone: focus stays in the status region
    (removeRef.current ?? undoRef.current)?.focus();
  };
  const topupReason = topup.near
    ? (topup.near.verb === "sell" ? m.offer_topup_near_sell : m.offer_topup_near_buy)({
        name,
        objekts: names(topup.near.picks),
      })
    : undefined;
  const line = matchesLine({ added, nearKeys, give, get, removed });
  const removeMatches = () => {
    const gave = takeOutAdded(give, addedGive);
    const got = takeOutAdded(get, addedGet);
    // a top-up the near picks opened, still with no amount, goes with them
    const { topup: next, taken } = topupWithoutNear(topup);
    flushSync(() => {
      setGive(gave.left);
      setGet(got.left);
      setRemoved({ give: gave.taken, get: got.taken, topupNear: taken });
      setTopup(next);
    });
    undoRef.current?.focus();
  };
  const undoRemove = () => {
    if (!removed) return;
    flushSync(() => {
      setGive((current) => putBack(current, removed.give));
      setGet((current) => putBack(current, removed.get));
      setTopup(topupRestored(topup, removed.topupNear));
      setRemoved(null);
    });
    removeRef.current?.focus();
  };
  const {
    create,
    send: sendOffer,
    error,
    refused,
    clearFailure,
  } = useSendOffer({
    onSent,
    give: giveShown,
    get: getShown,
    estimatedOf,
    collections,
  });

  // leaving while the send is on its way asks nothing: the send goes on either way, and a
  // refusal that lands after leaving shows as a toast
  const holdsDraft =
    !create.isPending && holdsDraftOf({ give, get, topup: topupNow, note }, prefill);

  useEffect(() => {
    onDraft(() => holdsDraft);
    return () => onDraft(null);
  }, [onDraft, holdsDraft]);

  const send = () => {
    if (topupError !== null) {
      // the error is drawn before focus lands, so the field is read with it
      flushSync(() => setTopup(touchTopup));
      amountRef.current?.focus();
      return;
    }
    if (!gate.canSend) return;
    clearFailure();
    sendOffer({
      ...offerInput(to, { give: giveShown, get: getShown, topup: topupNow, note }),
      counters: request.counter,
    });
  };

  const sides = { give: [give, setGive], get: [get, setGet] } as const;
  const shown = { give: giveShown, get: getShown };

  // a target the sender may not reach is refused before anything can be picked
  const upFront = offerRefusalOf(theirs.error);
  if (upFront) {
    return <BuilderRefused refusal={upFront} status={region !== undefined} onLeave={onLeave} />;
  }

  const matchesPortal =
    region && (line || nearLeft.length > 0)
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
      : null;

  return (
    <>
      {matchesPortal}
      <BuilderBody
        status={region !== undefined}
        sides={
          <>
            <div className="grid min-w-0 gap-6 md:grid-cols-2">
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
                    loading={side === "give" ? loadingAsks : loadingGet}
                    source={source}
                    onAdd={() => setPicking(side)}
                    onRemove={(pick) => setPicks(takeOut(picks, pick))}
                    onRemoveMany={(rows) => setPicks(takeOutAll(picks, rows))}
                  />
                );
              })}
            </div>
            {[...giveShown, ...getShown].some(
              (pick) => pick.objektId !== null && pick.serial !== null && estimatedOf(pick),
            ) ? (
              <EstimatedSerialNote />
            ) : null}
          </>
        }
        details={
          <div className="flex min-w-0 flex-col gap-5">
            <Topup
              amountRef={amountRef}
              on={topup.on}
              onToggle={(on) => setTopup((t) => toggleTopup(t, on))}
              amount={topup.amount}
              onAmount={(next) => setTopup((t) => ({ ...t, amount: next, touched: true }))}
              onAmountBlur={() => setTopup(touchTopup)}
              currency={topupNow.currency}
              onCurrency={(c) => setTopup((t) => ({ ...t, chosenCurrency: c }))}
              payer={topup.payer}
              onPayer={(p) => setTopup((t) => ({ ...t, payer: p }))}
              error={topup.touched ? topupError : null}
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
                aria-describedby={counterId}
                onChange={(event) => setNote(event.target.value)}
                placeholder={m.offer_note_placeholder()}
              />
              <p
                id={counterId}
                className={cn(
                  "self-end text-xs tabular-nums",
                  noteTooLong ? "text-destructive-foreground" : "text-muted-foreground",
                )}
              >
                {m.chat_counter({
                  count: noteLength.toLocaleString(getLocale()),
                  max: OFFER_NOTE_MAX_LENGTH.toLocaleString(getLocale()),
                })}
              </p>
            </div>

            <SendingAs />

            <SendError id={errorId} error={error} />
          </div>
        }
        hint={
          <p id={hintId} className="text-muted-foreground text-xs text-pretty">
            {gate.hint}
          </p>
        }
        cancel={
          <Button variant="outline" onClick={onLeave}>
            {m.common_modal_cancel()}
          </Button>
        }
        send={
          <Button
            disabled={gate.disabled}
            // a topup's reason stays clickable, so a send attempt shows it at the field
            aria-disabled={gate.ariaDisabled || undefined}
            className="flex-1 aria-disabled:opacity-64"
            loading={create.isPending}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            onClick={send}
          >
            {request.counter ? m.offer_send_counter() : m.offer_send()}
          </Button>
        }
        picker={
          picking ? (
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
              // the side as shown, so a copy standing in for an ask can be swapped for another
              picked={shown[picking]}
              onDone={(picks, found) => {
                // a picked copy is the sender's own now, no longer standing in for an ask
                sides[picking][1](picks.map(({ replaces: _r, ...pick }) => pick));
                setSeen((current) => ({ ...current, ...found }));
                setPicking(null);
              }}
            />
          ) : null
        }
      />
    </>
  );
}
