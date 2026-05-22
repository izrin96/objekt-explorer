import { GearIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import { Button } from "@/components/intentui/button";
import { m } from "@/paraglide/messages";

import { SettingsModal } from "./settings-modal";

export function SettingsButton({
  intent = "plain",
  ...props
}: React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        intent={intent}
        size="sm"
        className="[--btn-icon:var(--color-fg)]"
        aria-label={m.common_settings_title()}
        onPress={() => setOpen(true)}
        {...props}
      >
        <GearIcon />
      </Button>
      <SettingsModal open={open} setOpen={setOpen} />
    </>
  );
}
