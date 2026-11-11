import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useShownAs } from "./use-shown-as";

/** "Sending as <name> · Change", only for an account with two or more profiles to choose from. */
export function SendingAs({
  className,
  onNavigate,
}: {
  className?: string;
  /** closes the dialog the line sits in, as the link leaves it */
  onNavigate?: () => void;
}) {
  const shown = useShownAs();
  if (!shown || shown.profileCount < 2) return null;
  return (
    <p className={cn("text-muted-foreground min-w-0 text-xs text-pretty", className)}>
      {m.sending_as({ name: shown.name })}{" "}
      <Link
        to="/account/profiles"
        aria-label={m.sending_as_change_label()}
        onClick={onNavigate}
        className="text-foreground underline underline-offset-2 hover:no-underline"
      >
        {m.sending_as_change()}
      </Link>
    </p>
  );
}
