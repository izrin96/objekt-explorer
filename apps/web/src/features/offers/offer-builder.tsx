import { createContext, type ReactNode, use, useCallback, useRef, useState } from "react";

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
import { Dialog, DialogPopup } from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";

import { BuilderForm } from "./builder/form";
import type { OfferRequest } from "./builder/types";

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
  // the open form's "does the draft hold anything"; absent while it loads or is refused
  const draft = useRef<(() => boolean) | null>(null);
  const setDraft = useCallback((holds: (() => boolean) | null) => {
    draft.current = holds;
  }, []);
  const [confirming, setConfirming] = useState(false);
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
      <DialogPopup className="max-w-3xl max-sm:h-[calc(100dvh-(--spacing(12)))]">
        {request ? (
          <BuilderForm key={session} request={request} onDraft={setDraft} onDone={close} />
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
