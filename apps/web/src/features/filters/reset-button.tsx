import { XIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

/**
 * Only ever disabled, never hidden, so its place never moves. Red only while
 * there is something to reset.
 */
export function ResetButton({ onReset, disabled }: { onReset: () => void; disabled: boolean }) {
  return (
    <Button
      variant={disabled ? "outline" : "destructive-outline"}
      size="sm"
      className="gap-1.5"
      disabled={disabled}
      onClick={onReset}
    >
      <XIcon />
      {m.filter_reset_filter()}
    </Button>
  );
}
