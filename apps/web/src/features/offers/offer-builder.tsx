import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

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
