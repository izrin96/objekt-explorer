import { WarningIcon } from "@phosphor-icons/react";

import { TONE_FILL, TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";

export function StepError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className={cn(
        TONE_FILL.warning,
        TONE_INK.warning,
        "flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-pretty",
      )}
    >
      <WarningIcon className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}
