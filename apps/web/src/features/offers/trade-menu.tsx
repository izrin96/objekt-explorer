import {
  DotsThreeIcon,
  FlagIcon,
  HandshakeIcon,
  type Icon,
  XCircleIcon,
} from "@phosphor-icons/react";
import type { TradeView as Trade } from "@repo/api/schemas/offer";
import { useHydrated } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { m } from "@/paraglide/messages";

import { type TradeMenuKey, tradeMenuItems } from "./trade-menu-items";

const ICONS: Record<TradeMenuKey, Icon> = {
  report: FlagIcon,
  cancel: XCircleIcon,
  askCancel: HandshakeIcon,
};

type Handlers = { onReport: () => void; onCancel: () => void; onAskCancel: () => void };

function items(trade: Trade, hydrated: boolean, { onReport, onCancel, onAskCancel }: Handlers) {
  const onSelect: Record<TradeMenuKey, () => void> = {
    report: onReport,
    cancel: onCancel,
    askCancel: onAskCancel,
  };
  return tradeMenuItems(trade, hydrated).map(({ key, label, reason }) => ({
    key,
    label,
    reason,
    icon: ICONS[key],
    onSelect: onSelect[key],
  }));
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
