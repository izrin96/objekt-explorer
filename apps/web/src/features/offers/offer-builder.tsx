import { OFFER_SIDE_LIMIT } from "@repo/api/schemas/offer";
import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  Fragment,
  type ReactNode,
  type Ref,
  type RefObject,
  use,
  useCallback,
  useRef,
  useState,
} from "react";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogPanel,
  DialogPopup,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { type NearGroup, nearPayer, takeNear, withNear } from "@/features/offers/near-picks";
import { pickKey, toPick } from "@/features/offers/pick";
import { suggestOptions } from "@/features/offers/queries";
import { m } from "@/paraglide/messages";

import { BuilderForm } from "./builder/form";
import { BuilderHeader } from "./builder/header";
import { StatusLine } from "./builder/matches-line";
import type { OfferMatches, OfferRequest } from "./builder/types";

export type { OfferRequest } from "./builder/types";

/** Both sides' shape while the matches load: a heading, the Add button and a row of tiles. */
function SidesSkeleton() {
  return (
    <>
      <DialogPanel>
        <div className="grid min-w-0 gap-6 sm:grid-cols-2">
          {[0, 1].map((side) => (
            <div key={side} className="@container flex min-w-0 flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-44 rounded-md" />
              <div className="grid grid-cols-4 gap-1 p-0.5 @sm:grid-cols-6">
                {Array.from({ length: 4 }, (_, tile) => (
                  <Skeleton key={tile} className="aspect-photocard rounded-photocard" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
      </DialogFooter>
    </>
  );
}

/**
 * A builder that opens with the swap matches. It owns the header and one status region, which
 * stays mounted from the first frame to the close: it reads "Adding your matches…", then the
 * form draws its line into it, or it reads the failure.
 */
function MatchesBuilder({
  request,
  matches,
  titleRef,
  onDraft,
  onDone,
}: {
  request: OfferRequest;
  matches: OfferMatches;
  titleRef: Ref<HTMLHeadingElement>;
  onDraft: (holds: (() => boolean) | null) => void;
  onDone: () => void;
}) {
  const suggest = useQuery(suggestOptions(matches));
  const [region, setRegion] = useState<HTMLDivElement | null>(null);
  const data = suggest.data;
  const groups: NearGroup[] = (data?.near ?? []).map((group) => ({
    side: group.side,
    verb: group.verb,
    picks: group.items.map(toPick),
  }));
  const { taken, left } = takeNear(groups, request.addNear);
  // Make offer with it adds its pick after the matches, while the side has room
  const start = (side: "give" | "get") => {
    const base = (data?.[side] ?? []).map(toPick);
    return taken?.side === side
      ? withNear(base, { side, verb: taken.verb, picks: [taken.pick] }, OFFER_SIDE_LIMIT)
      : { picks: base, added: [] };
  };
  const give = start("give");
  const get = start("get");
  const addedAtOpen = [...give.added, ...get.added];
  const missed = data !== undefined && request.addNear !== undefined && addedAtOpen.length === 0;
  return (
    <>
      <BuilderHeader request={request} titleRef={titleRef} />
      <div ref={setRegion} role="status" className="px-6 pb-3 empty:sr-only">
        {suggest.isPending ? (
          <p className="text-muted-foreground text-sm">{m.offer_matches_loading()}</p>
        ) : suggest.isError ? (
          <StatusLine tone="warning">{m.offer_matches_failed()}</StatusLine>
        ) : missed ? (
          <StatusLine tone="warning">{m.offer_near_unavailable()}</StatusLine>
        ) : null}
      </div>
      {suggest.isPending ? (
        <SidesSkeleton />
      ) : (
        <BuilderForm
          request={
            data
              ? {
                  ...request,
                  prefill: {
                    give: give.picks,
                    get: get.picks,
                    collections: data.collections,
                  },
                }
              : request
          }
          region={region}
          added={
            data
              ? {
                  keys: { give: data.give.map(pickKey), get: data.get.map(pickKey) },
                  matched: data.matched,
                  postName: data.postName,
                  near: left,
                  nearKeys: {
                    give: give.added.map((pick) => pick.key),
                    get: get.added.map((pick) => pick.key),
                  },
                  nearTopup:
                    taken && nearPayer(taken.verb) && addedAtOpen.length > 0
                      ? { verb: taken.verb, picks: addedAtOpen }
                      : undefined,
                }
              : undefined
          }
          onDraft={onDraft}
          onDone={onDone}
        />
      )}
    </>
  );
}

function OfferBuilder({
  request,
  session,
  open,
  onOpenChange,
  finalFocus,
}: {
  request: OfferRequest | null;
  /** counts the openings, so each one starts a fresh form */
  session: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** where focus goes on close, when what opened it is gone, as a menu item is */
  finalFocus?: RefObject<HTMLElement | null>;
}) {
  // the open form's "does the draft hold anything"; absent while it loads or is refused
  const draft = useRef<(() => boolean) | null>(null);
  const setDraft = useCallback((holds: (() => boolean) | null) => {
    draft.current = holds;
  }, []);
  const [confirming, setConfirming] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const close = () => {
    setConfirming(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && draft.current?.()) setConfirming(true);
        else onOpenChange(next);
      }}
    >
      {/* below `sm` the sheet sits in an auto-height grid row, so `h-full` would shrink to its
          content: its height is set outright, under the viewport's top inset */}
      <DialogPopup
        className="max-w-3xl max-sm:h-[calc(100dvh-(--spacing(12)))] lg:max-w-5xl"
        // the matches builder opens on its title, not on a placeholder or Remove matches
        initialFocus={request?.matches ? titleRef : undefined}
        finalFocus={finalFocus}
      >
        {request?.matches ? (
          <MatchesBuilder
            key={session}
            request={request}
            matches={request.matches}
            titleRef={titleRef}
            onDraft={setDraft}
            onDone={close}
          />
        ) : request ? (
          <Fragment key={session}>
            <BuilderHeader request={request} />
            <BuilderForm request={request} onDraft={setDraft} onDone={close} />
          </Fragment>
        ) : null}
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>{m.offer_discard_title()}</AlertDialogTitle>
              <AlertDialogDescription>{m.offer_discard_desc()}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="outline" />}>
                {m.offer_discard_keep()}
              </AlertDialogClose>
              <Button variant="destructive" onClick={close}>
                {m.offer_discard_confirm()}
              </Button>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </DialogPopup>
    </Dialog>
  );
}

/** One builder per surface; `open` replaces whatever it was last opened with. */
export function useOfferBuilder() {
  const [request, setRequest] = useState<OfferRequest | null>(null);
  const [session, setSession] = useState(0);
  const [open, setOpen] = useState(false);
  const [finalFocus, setFinalFocus] = useState<RefObject<HTMLElement | null>>();
  const openWith = useCallback(
    (next: OfferRequest, options?: { finalFocus?: RefObject<HTMLElement | null> }) => {
      setRequest(next);
      setSession((n) => n + 1);
      setFinalFocus(options?.finalFocus);
      setOpen(true);
    },
    [],
  );
  return {
    open: openWith,
    element: (
      <OfferBuilder
        request={request}
        session={session}
        open={open}
        onOpenChange={setOpen}
        finalFocus={finalFocus}
      />
    ),
  };
}

const SharedBuilder = createContext<((request: OfferRequest) => void) | null>(null);

/**
 * One builder above a virtualised list: a row unmounts with its dialog and draft otherwise.
 * `MakeOfferButton` opens this one when it sits under it.
 */
export function OfferBuilderProvider({ children }: { children: ReactNode }) {
  const builder = useOfferBuilder();
  return (
    <SharedBuilder value={builder.open}>
      {children}
      {builder.element}
    </SharedBuilder>
  );
}

/** The provider's opener, or `null` where there is none. */
export function useSharedOfferBuilder() {
  return use(SharedBuilder);
}
