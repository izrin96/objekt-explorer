import { UsersIcon } from "@heroicons/react/24/outline";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useEffect, useMemo, useState } from "react";
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

type TradeMode = "have-to-want" | "want-to-have" | "both";

export default function TradeMatches() {
  const list = useListTarget()!;
  const isAuthed = useListAuthed();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TradeMode>(() =>
    list.listTypeNew === "have" ? "have-to-want" : "want-to-have",
  );

  // Reset mode when navigating between different list types
  useEffect(() => {
    setMode(list.listTypeNew === "have" ? "have-to-want" : "want-to-have");
  }, [list.listTypeNew]);

  const isPaired = !!list.linkedList;

  // Resolve the slug to pass based on selected mode
  const effectiveSlug = useMemo(() => {
    if (!isPaired) return list.slug;
    if (mode === "both") return list.slug;
    if (mode === "have-to-want") {
      return list.listTypeNew === "have" ? list.slug : list.linkedList!.slug;
    }
    // want-to-have
    return list.listTypeNew === "want" ? list.slug : list.linkedList!.slug;
  }, [list, mode, isPaired]);

  // Available modes for the current list
  const availableModes = useMemo<TradeMode[]>(() => {
    if (!isPaired) {
      return list.listTypeNew === "have" ? ["have-to-want"] : ["want-to-have"];
    }
    return ["have-to-want", "both", "want-to-have"];
  }, [isPaired, list.listTypeNew]);

  const modeLabel = (modeValue: TradeMode) => {
    switch (modeValue) {
      case "have-to-want":
        return m.list_trade_mode_have_to_want();
      case "want-to-have":
        return m.list_trade_mode_want_to_have();
      case "both":
        return m.list_trade_mode_both();
    }
  };

  // Only show for authenticated owner of have/want lists
  if (!isAuthed || !["have", "want"].includes(list.listTypeNew)) {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        intent="outline"
        onPress={() => setOpen(true)}
        aria-label={m.list_trade_matches_title()}
        className="w-auto"
      >
        <UsersIcon />
        <span className="hidden lg:inline">{m.list_trade_matches_title()}</span>
      </Button>

      <ModalContent isOpen={open} onOpenChange={setOpen} size="3xl">
        <ModalHeader>
          <ModalTitle>{m.list_trade_matches_title()}</ModalTitle>
          <ModalDescription>{m.list_trade_matches_description()}</ModalDescription>
          {availableModes.length > 1 && (
            <div className="flex gap-1 pt-2">
              {availableModes.map((modeValue) => (
                <Button
                  key={modeValue}
                  size="sm"
                  intent={mode === modeValue ? "primary" : "outline"}
                  onPress={() => setMode(modeValue)}
                >
                  {modeLabel(modeValue)}
                </Button>
              ))}
            </div>
          )}
        </ModalHeader>
        <ModalBody>
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
                <Suspense
                  key={effectiveSlug + mode}
                  fallback={
                    <div className="flex justify-center py-6">
                      <Loader variant="ring" />
                    </div>
                  }
                >
                  <TradeMatchesContent slug={effectiveSlug} mode={mode} />
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
