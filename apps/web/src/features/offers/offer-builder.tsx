import { ArrowLeftIcon } from "@phosphor-icons/react";
import { OFFER_SIDE_LIMIT } from "@repo/api/schemas/offer";
import { useQuery } from "@tanstack/react-query";
import { useBlocker, useLocation, useRouter } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { type NearGroup, nearPayer, takeNear, withNear } from "@/features/offers/near-picks";
import { pickKey, toPick } from "@/features/offers/pick";
import { suggestOptions } from "@/features/offers/queries";
import { useMountedRef } from "@/hooks/use-mounted-ref";
import { m } from "@/paraglide/messages";

import { BuilderForm } from "./builder/form";
import { BuilderHeader } from "./builder/header";
import { BuilderBody, BuilderGrid, BuilderTitle, STATUS_AREA } from "./builder/layout";
import { StatusLine } from "./builder/matches-line";
import type { OfferMatches, OfferRequest } from "./builder/types";
import { disarmReturn, forgetOpener } from "./return-focus";
import { useLeaveOffer } from "./use-leave-offer";

/** Both sides' shape while the matches load: a heading, the Add button and a row of tiles. */
function SidesSkeleton() {
  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-2">
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
  );
}

type BuilderProps = {
  request: OfferRequest;
  onLeave: () => void;
  onDraft: (holds: (() => boolean) | null) => void;
  onSent: (conversationId: number, ready: Promise<unknown>) => void;
};

/**
 * A builder that opens with the swap matches. It owns the title and one status region, which
 * stays mounted from the first frame to the leaving: it reads "Adding your matches…", then the
 * form draws its line into it, or it reads the failure.
 */
function MatchesBuilder({
  request,
  matches,
  onLeave,
  onDraft,
  onSent,
}: BuilderProps & { matches: OfferMatches }) {
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
    <BuilderGrid>
      <BuilderTitle>
        <BuilderHeader request={request} />
      </BuilderTitle>
      <div ref={setRegion} role="status" className={`${STATUS_AREA} empty:sr-only`}>
        {suggest.isPending ? (
          <p className="text-muted-foreground text-sm">{m.offer_matches_loading()}</p>
        ) : suggest.isError ? (
          <StatusLine tone="warning">{m.offer_matches_failed()}</StatusLine>
        ) : missed ? (
          <StatusLine tone="warning">{m.offer_near_unavailable()}</StatusLine>
        ) : null}
      </div>
      {suggest.isPending ? (
        <BuilderBody
          status
          sides={<SidesSkeleton />}
          cancel={
            <Button variant="outline" onClick={onLeave}>
              {m.common_modal_cancel()}
            </Button>
          }
        />
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
                  postSlug: data.postSlug,
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
          onLeave={onLeave}
          onDraft={onDraft}
          onSent={onSent}
        />
      )}
    </BuilderGrid>
  );
}

/**
 * The offer page's builder, below Back to <name>. Leaving by any route (Back, Cancel, a link, the
 * browser's back) asks first while the draft holds something; a reload or a closed tab gets the
 * browser's own prompt. Mounted per start, so a new link begins afresh.
 */
export function OfferPage({ request, backHref }: { request: OfferRequest; backHref: string }) {
  const router = useRouter();
  const leave = useLeaveOffer(backHref);
  const openedInApp = useLocation({ select: (location) => location.state.offerBack === true });
  // the open form's "does the draft hold anything"; absent while it loads or is refused
  const draft = useRef<(() => boolean) | null>(null);
  const sent = useRef(false);
  const mounted = useMountedRef();
  const setDraft = useCallback((holds: (() => boolean) | null) => {
    draft.current = holds;
  }, []);
  const holds = () => !sent.current && (draft.current?.() ?? false);
  const blocker = useBlocker({
    shouldBlockFn: holds,
    enableBeforeUnload: holds,
    withResolver: true,
  });

  // marked sent as the server answers, so leaving while the thread loads asks nothing
  const onSent = (conversationId: number, ready: Promise<unknown>) => {
    sent.current = true;
    forgetOpener();
    void ready.then(() => {
      // the mutation outlives the page: a reader who left meanwhile stays where they went
      if (!mounted.current) return;
      const thread = `/messages/${conversationId}`;
      // opened from that thread, it is already the entry below: going back keeps one copy of it
      if (
        openedInApp &&
        router.history.canGoBack() &&
        new URL(backHref, window.location.origin).pathname === thread
      ) {
        router.history.back();
        return;
      }
      void router.navigate({
        to: "/messages/$id",
        params: { id: String(conversationId) },
        replace: true,
      });
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="-ms-2 w-fit max-w-full"
        render={
          <a
            href={backHref}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              leave();
            }}
          />
        }
      >
        <ArrowLeftIcon />
        <span className="truncate">{m.offer_page_back({ name: request.name })}</span>
      </Button>
      {request.matches ? (
        <MatchesBuilder
          request={request}
          matches={request.matches}
          onLeave={leave}
          onDraft={setDraft}
          onSent={onSent}
        />
      ) : (
        <BuilderGrid>
          <BuilderTitle>
            <BuilderHeader request={request} />
          </BuilderTitle>
          <BuilderForm request={request} onLeave={leave} onDraft={setDraft} onSent={onSent} />
        </BuilderGrid>
      )}
      <AlertDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (open) return;
          disarmReturn();
          blocker.reset?.();
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.offer_discard_title()}</AlertDialogTitle>
            <AlertDialogDescription>{m.offer_discard_desc()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {m.offer_discard_keep()}
            </AlertDialogClose>
            <Button variant="destructive" onClick={() => blocker.proceed?.()}>
              {m.offer_discard_confirm()}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
