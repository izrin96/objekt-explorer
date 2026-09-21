import { CopyIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Copy one value to the clipboard and say so. Three surfaces show a value next
 * to this button — the profile header's address, the linked-Cosmo card's
 * address and the drawer's token id — and each had its own try / catch with a
 * slightly different failure toast before this existed.
 *
 * `apps/website` has the same component at `components/shared/copy-button.tsx`.
 */
export function CopyButton({
  text,
  label,
  toastTitle,
  className,
}: {
  text: string;
  /** accessible name, e.g. "Copy address" */
  label: string;
  /** success toast title, e.g. "Address copied" */
  toastTitle: string;
  className?: string;
}): React.ReactElement {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toastManager.add({ type: "success", title: toastTitle });
    } catch {
      // the value is unreachable once the toast closes, so it rides along
      toastManager.add({ type: "error", title: "Clipboard blocked", description: text });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      className={cn("size-5.5 shrink-0 rounded-sm sm:size-5.5 [&_svg]:size-3.5", className)}
      onClick={() => void copy()}
    >
      <CopyIcon />
    </Button>
  );
}
