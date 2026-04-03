"use client";

import { GearIcon } from "@phosphor-icons/react/dist/ssr";
import { useIntlayer } from "next-intlayer";
import { useState } from "react";

import { SettingsModal } from "./settings-modal";
import { Button } from "./ui/button";

export function SettingsButton({
  intent = "plain",
  ...props
}: React.ComponentProps<typeof Button>) {
  const content = useIntlayer("common");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        intent={intent}
        size="sm"
        className="px-2 [--btn-icon:var(--color-fg)] sm:px-2"
        aria-label={content.settings.title.value}
        onPress={() => setOpen(true)}
        {...props}
      >
        <GearIcon className="size-5 sm:size-4" />
      </Button>
      <SettingsModal open={open} setOpen={setOpen} />
    </>
  );
}
