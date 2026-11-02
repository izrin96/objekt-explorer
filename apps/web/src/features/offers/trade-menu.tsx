import {
  DotsThreeIcon,
  FlagIcon,
  HandshakeIcon,
  type Icon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { REPORT_AFTER_DAYS, type TradeView as Trade } from "@repo/api/schemas/offer";
import { useHydrated } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { untilLabel } from "@/features/chat/format";
import { m } from "@/paraglide/messages";

import { shortDate } from "./format";

const DAY_MS = 86_400_000;

type Item = {
  key: string;
  icon: Icon;
  label: string;
  /** why it can't be used; set means the item shows disabled */
  reason: ReactNode | null;
  onSelect: () => void;
};

type Handlers = { onReport: () => void; onCancel: () => void; onAskCancel: () => void };

function items(trade: Trade, hydrated: boolean, { onReport, onCancel, onAskCancel }: Handlers) {
  const list: Item[] = [];
  const inProgress = trade.status === "in_progress";
  if (inProgress || (trade.status === "failed" && trade.canReport)) {
    const opens = new Date(Date.parse(trade.acceptedAt) + REPORT_AFTER_DAYS * DAY_MS);
    list.push({
      key: "report",
      icon: FlagIcon,
      label: m.offer_report_problem(),
      reason: trade.canReport
        ? null
        : // the viewer's zone, so the date waits for the client
          hydrated
          ? m.offer_report_opens({ date: shortDate(opens.toISOString()) })
          : "",
      onSelect: onReport,
    });
  }
  if (inProgress) {
    list.push({
      key: "cancel",
      icon: XCircleIcon,
      label: m.offer_trade_cancel(),
      reason: trade.canCancel
        ? null
        : trade.cancelLocked
          ? m.offer_cancel_locked()
          : trade.indexerBehind
            ? m.offer_refused_indexer_behind()
            : "",
      onSelect: onCancel,
    });
    // an open request shows on the status card instead
    if (!trade.canCancel && !trade.cancelRequest) {
      const opens = trade.cancelAskOpensAt;
      list.push({
        key: "askCancel",
        icon: HandshakeIcon,
        label: m.offer_cancel_ask(),
        reason: opens
          ? // the viewer's zone, so the time waits for the client
            hydrated
            ? m.offer_cancel_ask_opens({ date: untilLabel(opens) })
            : ""
          : null,
        onSelect: onAskCancel,
      });
    }
  }
  return list;
}

/**
 * The header's ⋯ menu. A disabled item stays focusable (Base UI keeps disabled menu items in the
 * keyboard order), with its reason as a second line that reads with its label.
 */
export function TradeMenu({
  trade,
  size = "icon",
  ...handlers
}: Handlers & {
  trade: Trade;
  size?: "icon" | "icon-xl";
}) {
  const hydrated = useHydrated();
  const list = items(trade, hydrated, handlers);
  if (list.length === 0) return null;
  return (
    <Menu>
      <MenuTrigger
        render={<Button variant="outline" size={size} aria-label={m.offer_trade_more()} />}
      >
        <DotsThreeIcon weight="bold" />
      </MenuTrigger>
      <MenuPopup align="end" className="max-w-72">
        {list.map((item) => (
          <MenuItem
            key={item.key}
            disabled={item.reason !== null}
            className="items-start py-1.5"
            onClick={item.onSelect}
          >
            {/* top-aligned with the label, above the reason line */}
            <item.icon className="mt-0.5" />
            <span className="flex flex-col">
              <span>{item.label}</span>
              {item.reason ? (
                <span className="text-muted-foreground text-xs text-pretty">{item.reason}</span>
              ) : null}
            </span>
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
}
