import { LinkIcon } from "@phosphor-icons/react";
import {
  type CandidateItem,
  OFFER_NOTE_MAX_LENGTH,
  OFFER_SIDE_LIMIT,
  type TopupPayer,
} from "@repo/api/schemas/offer";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter, DialogPanel } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchNewer, invalidateChatLists } from "@/features/chat/queries";
import { itemLabel, itemName } from "@/features/offers/format";
import { OfferPicker } from "@/features/offers/offer-picker";
import {
  blockedReason,
  type Collections,
  type OfferPick,
  type OfferSide,
  pickKey,
  toPick,
} from "@/features/offers/pick";
import {
  invalidateOfferLists,
  myCopyOptions,
  myWantListOptions,
  theirCandidatesOptions,
} from "@/features/offers/queries";
import { offerRefusalOf, offerRefusalText, refusedKeys } from "@/features/offers/refusal";
import { shortcutItems, togglePick } from "@/features/offers/shortcuts";
import { useCurrency } from "@/features/settings/use-currency";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { FocusStrip, FocusStripSkeleton } from "./focus-strip";
import { BuilderHeader } from "./header";
import { BuilderRefused } from "./refused";
import { SideColumn } from "./side-column";
import { Topup } from "./topup";
import type { OfferPrefill, OfferRequest } from "./types";

const holds = (picks: readonly OfferPick[], item: CandidateItem) =>
  picks.some((pick) => pick.key === pickKey(item));

export function BuilderForm({
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
  const mineWanted = useQuery(myWantListOptions(to, request.focusWantList));
  const theirFlags = new Map((theirs.data?.items ?? []).map((item) => [pickKey(item), item]));
  const collections: Collections = {
    ...theirs.data?.collections,
    ...mineWanted.data?.collections,
    ...seen,
  };
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

  const wanted = new Set(theirs.data?.wanted ?? []);
  const getFocus = shortcutItems(
    (theirs.data?.items ?? []).filter(
      (item) => item.listSlug === request.focusList && blockedReason(item) === null,
    ),
    (item) => wanted.has(item.collectionSlug),
  );
  // the first page's have-list objekts lead it and recur among its items
  const mineOnWant = new Map(
    [...(mineWanted.data?.suggested ?? []), ...(mineWanted.data?.items ?? [])].map((item) => [
      pickKey(item),
      item,
    ]),
  );
  const giveFocus = shortcutItems(
    [...mineOnWant.values()].filter((item) => blockedReason(item) === null),
    (item) => item.listSlug !== null,
  );

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
        const keys = refusedKeys(refusal);
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

  const shown = { give: giveShown, get };

  const toggleFocused = (side: OfferSide, item: CandidateItem) =>
    sides[side][1]((current) => togglePick(current, shown[side], toPick(item), OFFER_SIDE_LIMIT));
  const shortcuts = {
    give: {
      shown: request.focusWantList !== undefined,
      pending: mineWanted.isPending,
      items: giveFocus,
      full: giveShown.length >= OFFER_SIDE_LIMIT,
      label: m.offer_focus_give_hint(),
    },
    get: {
      shown: request.focusList !== undefined,
      pending: theirs.isPending,
      items: getFocus,
      full: get.length >= OFFER_SIDE_LIMIT,
      label: m.offer_focus_hint(),
    },
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
            const shortcut = shortcuts[side];
            return (
              <SideColumn
                key={side}
                side={side}
                name={name}
                picks={shown[side]}
                collections={collections}
                flagsOf={flagsOf}
                reasonOf={(pick) => reasonOf(side, pick)}
                refused={refused}
                onAdd={() => setPicking(side)}
                onRemove={(key) => setPicks(picks.filter((pick) => pick.key !== key))}
              >
                {!shortcut.shown ? null : shortcut.pending ? (
                  <FocusStripSkeleton label={shortcut.label} />
                ) : shortcut.items.length > 0 ? (
                  <FocusStrip
                    label={shortcut.label}
                    items={shortcut.items}
                    collections={collections}
                    full={shortcut.full}
                    isSelected={(item) => holds(shown[side], item)}
                    onToggle={(item) => toggleFocused(side, item)}
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
