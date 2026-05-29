import { UsersIcon } from "@heroicons/react/24/outline";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { Button } from "@/components/intentui/button";
import { Loader } from "@/components/intentui/loader";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import ErrorFallbackRender from "@/components/router/error-boundary";
import { useListTarget } from "@/hooks/use-list-target";
import { useListAuthed } from "@/hooks/use-user";
import { m } from "@/paraglide/messages";

import TradeMatchesContent from "./trade-matches-content";

export default function TradeMatches() {
  const list = useListTarget()!;
  const isAuthed = useListAuthed();
  const [open, setOpen] = useState(false);

  // Only show for authenticated owner of have/want lists that are trade-active
  if (!isAuthed || !["have", "want"].includes(list.listTypeNew) || !list.linkedList) {
    return null;
  }

  return (
    <>
      <Button size="sm" intent="outline" onPress={() => setOpen(true)} className="w-auto">
        <UsersIcon />
        <span className="hidden md:inline">{m.list_trade_matches_title()}</span>
      </Button>

      <ModalContent isOpen={open} onOpenChange={setOpen} size="3xl">
        <ModalHeader>
          <ModalTitle>{m.list_trade_matches_title()}</ModalTitle>
          <ModalDescription>{m.list_trade_matches_description()}</ModalDescription>
        </ModalHeader>
        <ModalBody>
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
                <Suspense
                  fallback={
                    <div className="flex justify-center py-6">
                      <Loader variant="ring" />
                    </div>
                  }
                >
                  <TradeMatchesContent slug={list.slug} />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </ModalBody>
        <ModalFooter>
          <ModalClose>{m.common_modal_close()}</ModalClose>
        </ModalFooter>
      </ModalContent>
    </>
  );
}
