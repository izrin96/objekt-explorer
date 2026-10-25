import { CopyIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { copyWithToast } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

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
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      className={cn("size-5.5 shrink-0 rounded-sm sm:size-5.5 [&_svg]:size-3.5", className)}
      onClick={() => void copyWithToast(text, { title: toastTitle })}
    >
      <CopyIcon />
    </Button>
  );
}
