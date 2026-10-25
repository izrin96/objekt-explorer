import { InfoIcon, XIcon } from "@phosphor-icons/react";
import { useHydrated } from "@tanstack/react-router";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import { useNoticesStore } from "@/stores/notices";

const KEY = "privacy-settings-removed";

/** Goes with the change that drops the retired privacy columns. */
export function PrivacyRemovedNotice() {
  // the server cannot know what this browser dismissed, so nothing shows before hydration
  const hydrated = useHydrated();
  const dismissed = useNoticesStore((s) => s.dismissed.includes(KEY));
  const dismiss = useNoticesStore((s) => s.dismiss);
  if (!hydrated || dismissed) return null;

  return (
    <Alert variant="info" role="status">
      <InfoIcon />
      <AlertTitle>{m.link_privacy_removed_title()}</AlertTitle>
      <AlertDescription>{m.link_privacy_removed_desc()}</AlertDescription>
      <AlertAction>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.common_modal_close()}
          onClick={() => dismiss(KEY)}
        >
          <XIcon />
        </Button>
      </AlertAction>
    </Alert>
  );
}
