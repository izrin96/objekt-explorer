import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useState } from "react";

import { useTranslations } from "@/lib/i18n/context";

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
