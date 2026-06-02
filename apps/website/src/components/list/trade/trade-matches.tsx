import { InformationCircleIcon, UsersIcon } from "@heroicons/react/24/outline";
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
import {
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from "@/components/intentui/popover";
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

      <TradeMatchesInfo />

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

function TradeMatchesInfo() {
  return (
    <Popover>
      <Button size="sm" intent="outline" aria-label={m.list_trade_info_title()}>
        <InformationCircleIcon />
      </Button>
      <PopoverContent className="max-w-sm pb-6">
        <PopoverHeader>
          <PopoverTitle>{m.list_trade_info_title()}</PopoverTitle>
        </PopoverHeader>
        <PopoverBody className="text-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-fg border-border border-b">
                <th className="pr-2 pb-1.5 font-medium">{m.list_trade_info_mode_header()}</th>
                <th className="pr-2 pb-1.5 font-medium">{m.list_trade_info_your_list_header()}</th>
                <th className="pr-2 pb-1.5 font-medium">{m.list_trade_info_matches_header()}</th>
                <th className="pr-2 pb-1.5 font-medium">
                  {m.list_trade_info_discoverable_header()}
                </th>
                <th className="pb-1.5 font-medium">{m.list_trade_info_pairing_header()}</th>
              </tr>
            </thead>
            <tbody className="*:border-border *:border-b">
              <tr>
                <td className="py-1.5 pr-2 font-medium">{m.list_trade_mode_have_to_want()}</td>
                <td className="text-muted-fg py-1.5 pr-2">{m.list_trade_info_have_entries()}</td>
                <td className="text-muted-fg py-1.5 pr-2">{m.list_trade_mode_want_to_have()}</td>
                <td className="text-muted-fg py-1.5 pr-2">
                  {m.list_trade_info_discoverable_partner()}
                </td>
                <td className="text-muted-fg py-1.5">{m.list_trade_info_pairing_not_required()}</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-2 font-medium">{m.list_trade_mode_want_to_have()}</td>
                <td className="text-muted-fg py-1.5 pr-2">{m.list_trade_info_want_entries()}</td>
                <td className="text-muted-fg py-1.5 pr-2">{m.list_trade_mode_have_to_want()}</td>
                <td className="text-muted-fg py-1.5 pr-2">
                  {m.list_trade_info_discoverable_partner()}
                </td>
                <td className="text-muted-fg py-1.5">{m.list_trade_info_pairing_not_required()}</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-2 font-medium">{m.list_trade_mode_both()}</td>
                <td className="text-muted-fg py-1.5 pr-2">
                  {m.list_trade_info_have_want_paired()}
                </td>
                <td className="text-muted-fg py-1.5 pr-2">
                  {m.list_trade_info_have_want_paired()}
                </td>
                <td className="text-muted-fg py-1.5 pr-2">
                  {m.list_trade_info_discoverable_partner()}
                </td>
                <td className="text-muted-fg py-1.5">{m.list_trade_info_pairing_required()}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-muted-fg mt-3 text-xs leading-relaxed">{m.list_trade_info_footer()}</p>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
