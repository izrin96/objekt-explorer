import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { currentUserOptions } from "@/features/user/queries";
import { displayNickname, isSameAddress } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/**
 * The name other people see the signed-in account by: its default profile, else its display
 * name, as the server's `chatIdentity` names it. `profileCount` decides whether there is a
 * default to change.
 */
export function useShownAs() {
  const { data } = useQuery(currentUserOptions);
  if (!data) return null;
  const profile = data.profiles.find((p) => isSameAddress(p.address, data.defaultAddress));
  return {
    name: profile ? displayNickname(profile.address, profile.nickname) : data.user.name,
    profileCount: data.profiles.length,
  };
}

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
