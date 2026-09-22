import { InfoIcon, UsersIcon } from "@phosphor-icons/react";
import type { ListTypeNew } from "@repo/api/schemas/list";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useListTarget } from "../list-provider";
import { useListOwned } from "../use-list-owned";
import { TradeMatchesContent } from "./content";
import type { TradeMode } from "./queries";

const MODE_LABEL: Record<TradeMode, () => string> = {
  "have-to-want": m.list_trade_mode_have_to_want,
  "want-to-have": m.list_trade_mode_want_to_have,
  both: m.list_trade_mode_both,
};

/** matching runs from the have list outwards, so the list's own type picks the direction */
function naturalMode(type: ListTypeNew): TradeMode {
  return type === "have" ? "have-to-want" : "want-to-have";
}

export function TradeMatchesButton() {
  const list = useListTarget();
  const isOwner = useListOwned();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TradeMode>(() => naturalMode(list.listTypeNew));
  const [lastType, setLastType] = useState<ListTypeNew>(list.listTypeNew);

  // swapping to the paired list keeps this mounted, and the old direction no
  // longer applies to the new list
  if (lastType !== list.listTypeNew) {
    setLastType(list.listTypeNew);
    setMode(naturalMode(list.listTypeNew));
  }

  if (!isOwner || (list.listTypeNew !== "have" && list.listTypeNew !== "want")) return null;

  const linked = list.linkedList ?? null;
  // "both" needs a Have and a Want list to match in each direction
  const modes: TradeMode[] = linked
    ? ["have-to-want", "both", "want-to-have"]
    : [naturalMode(list.listTypeNew)];

  // every mode but "both" is anchored on the list of that direction, which may
  // be the linked one rather than the one being viewed
  const anchorType = mode === "have-to-want" ? "have" : "want";
  const slug =
    linked && mode !== "both" && list.listTypeNew !== anchorType ? linked.slug : list.slug;

  const body = <TradeMatchesContent slug={slug} mode={mode} />;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UsersIcon />
        {m.list_trade_matches_title()}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPopup className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-1">
              <DialogTitle className="font-display">{m.list_trade_matches_title()}</DialogTitle>
              <TradeMatchesInfo />
            </div>
            <DialogDescription>{m.list_trade_matches_description()}</DialogDescription>
          </DialogHeader>

          {modes.length > 1 ? (
            <Tabs
              value={mode}
              onValueChange={(value) => setMode(value as TradeMode)}
              className="min-h-0 gap-0"
            >
              <div className="shrink-0 px-6">
                <TabsList>
                  {modes.map((value) => (
                    <TabsTab key={value} value={value}>
                      {MODE_LABEL[value]()}
                    </TabsTab>
                  ))}
                </TabsList>
              </div>
              <DialogPanel className="pt-4!">
                <TabsPanel value={mode}>{body}</TabsPanel>
              </DialogPanel>
            </Tabs>
          ) : (
            <DialogPanel>{body}</DialogPanel>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {m.common_modal_close()}
            </DialogClose>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  );
}

const INFO_HEADERS = [
  m.list_trade_info_mode_header,
  m.list_trade_info_your_list_header,
  m.list_trade_info_matches_header,
  m.list_trade_info_discoverable_header,
  m.list_trade_info_pairing_header,
];

const INFO_ROWS = [
  {
    key: "have-to-want",
    cells: [
      m.list_trade_mode_have_to_want,
      m.list_trade_info_have_entries,
      m.list_trade_mode_want_to_have,
      m.list_trade_info_discoverable_partner,
      m.list_trade_info_pairing_not_required,
    ],
  },
  {
    key: "want-to-have",
    cells: [
      m.list_trade_mode_want_to_have,
      m.list_trade_info_want_entries,
      m.list_trade_mode_have_to_want,
      m.list_trade_info_discoverable_partner,
      m.list_trade_info_pairing_not_required,
    ],
  },
  {
    key: "both",
    cells: [
      m.list_trade_mode_both,
      m.list_trade_info_have_want_paired,
      m.list_trade_info_have_want_paired,
      m.list_trade_info_discoverable_partner,
      m.list_trade_info_pairing_required,
    ],
  },
];

function TradeMatchesInfo() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={m.list_trade_info_title()}>
            <InfoIcon />
          </Button>
        }
      />
      <PopoverPopup className="max-w-96">
        <div className="flex flex-col gap-2.5">
          <PopoverTitle className="text-sm">{m.list_trade_info_title()}</PopoverTitle>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-foreground border-b">
                {INFO_HEADERS.map((header, index) => (
                  <th
                    key={header()}
                    scope="col"
                    className={cn("pb-1.5 font-medium", index < INFO_HEADERS.length - 1 && "pr-2")}
                  >
                    {header()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INFO_ROWS.map((row) => (
                <tr key={row.key} className="border-b last:border-b-0">
                  {row.cells.map((cell, index) => (
                    <td
                      key={`${row.key}-${index}`}
                      className={cn(
                        "py-1.5",
                        index < row.cells.length - 1 && "pr-2",
                        index === 0 ? "font-medium" : "text-muted-foreground",
                      )}
                    >
                      {cell()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-muted-foreground text-xs leading-relaxed text-pretty">
            {m.list_trade_info_footer()}
          </p>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
