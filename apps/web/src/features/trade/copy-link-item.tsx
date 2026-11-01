import { ShareNetworkIcon } from "@phosphor-icons/react";

import { MenuItem } from "@/components/ui/menu";
import { m } from "@/paraglide/messages";

/**
 * Copy link in a ⋯ menu. Disabled it stays focusable (Base UI keeps disabled items in the keyboard
 * order), with its reason as a second line that reads with the label.
 */
export function CopyLinkItem({ reason, onCopy }: { reason: string | null; onCopy: () => void }) {
  return (
    <MenuItem disabled={reason !== null} className="items-start py-1.5" onClick={onCopy}>
      <ShareNetworkIcon className="mt-0.5" />
      <span className="flex flex-col">
        <span>{m.trade_post_copy_link()}</span>
        {reason ? (
          <span className="text-muted-foreground max-w-60 text-xs text-pretty">{reason}</span>
        ) : null}
      </span>
    </MenuItem>
  );
}
