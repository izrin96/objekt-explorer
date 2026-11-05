import { type Icon, ShareNetworkIcon } from "@phosphor-icons/react";
import type { ReactElement } from "react";

import { MenuItem } from "@/components/ui/menu";
import { m } from "@/paraglide/messages";

/**
 * A ⋯ menu item that may be disabled for a reason. Disabled it stays focusable (Base UI keeps
 * disabled items in the keyboard order), with its reason as a second line that reads with the
 * label. `link` (a `<Link />`) makes it a link while enabled; disabled it renders plain, so it
 * can't be followed.
 */
export function ReasonItem({
  icon: Glyph,
  label,
  reason,
  onClick,
  link,
}: {
  icon: Icon;
  label: string;
  reason: string | null;
  onClick?: () => void;
  link?: ReactElement;
}) {
  const disabled = reason !== null;
  return (
    <MenuItem
      disabled={disabled}
      className="items-start py-1.5"
      onClick={onClick}
      render={disabled ? undefined : link}
    >
      <Glyph className="mt-0.5" />
      <span className="flex flex-col">
        <span>{label}</span>
        {reason ? (
          <span className="text-muted-foreground max-w-60 text-xs text-pretty">{reason}</span>
        ) : null}
      </span>
    </MenuItem>
  );
}

/** Copy link in a ⋯ menu, disabled with its reason. */
export function CopyLinkItem({ reason, onCopy }: { reason: string | null; onCopy: () => void }) {
  return (
    <ReasonItem
      icon={ShareNetworkIcon}
      label={m.trade_post_copy_link()}
      reason={reason}
      onClick={onCopy}
    />
  );
}
