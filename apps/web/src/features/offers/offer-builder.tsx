import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, use, useCallback, useState } from "react";

import { Dialog, DialogPopup } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { BuilderForm } from "./builder/form";
import { BuilderHeader } from "./builder/header";
import type { OfferPrefill, OfferRequest } from "./builder/types";
import { toPick } from "./pick";
import { suggestOptions } from "./queries";

export type { OfferRequest } from "./builder/types";

function OfferBuilder({
  request,
  session,
  open,
  onOpenChange,
}: {
  request: OfferRequest | null;
  /** counts the openings, so each one starts a fresh form */
  session: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* below `sm` the sheet sits in an auto-height grid row, so `h-full` would shrink to its
          content: its height is set outright, under the viewport's top inset */}
      <DialogPopup className="max-w-3xl max-sm:h-[calc(100dvh-(--spacing(12)))]">
        {request ? (
          <BuilderLoader key={session} request={request} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}

/** One builder per surface; `open` replaces whatever it was last opened with. */
export function useOfferBuilder() {
  const [request, setRequest] = useState<OfferRequest | null>(null);
  const [session, setSession] = useState(0);
  const [open, setOpen] = useState(false);
  const openWith = useCallback((next: OfferRequest) => {
    setRequest(next);
    setSession((n) => n + 1);
    setOpen(true);
  }, []);
  return {
    open: openWith,
    element: (
      <OfferBuilder request={request} session={session} open={open} onOpenChange={setOpen} />
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
