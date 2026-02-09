"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";

import { useTranslations } from "next-intl";
import { useState } from "react";

import GenerateDiscordFormatModal from "./generate-discord-modal";
import { Button } from "./ui/button";

export function GenerateDiscordButton({ objekts }: { objekts: ValidObjekt[] }) {
  const t = useTranslations("discord_format_modal");
  const [genOpen, setGenOpen] = useState(false);
  return (
    <>
      <GenerateDiscordFormatModal objekts={objekts} open={genOpen} setOpen={setGenOpen} />
      <Button intent="outline" onPress={() => setGenOpen(true)}>
        {t("button")}
      </Button>
    </>
  );
}
