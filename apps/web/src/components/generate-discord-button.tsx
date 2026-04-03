"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useIntlayer } from "next-intlayer";
import { useState } from "react";

import GenerateDiscordFormatModal from "./generate-discord-modal";
import { Button } from "./ui/button";

export function GenerateDiscordButton({ objekts }: { objekts: ValidObjekt[] }) {
  const content = useIntlayer("discord_format_modal");
  const [genOpen, setGenOpen] = useState(false);
  return (
    <>
      <GenerateDiscordFormatModal objekts={objekts} open={genOpen} setOpen={setGenOpen} />
      <Button intent="outline" onPress={() => setGenOpen(true)}>
        {content.button.value}
      </Button>
    </>
  );
}
