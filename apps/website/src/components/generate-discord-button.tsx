import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import GenerateDiscordFormatModal from "./generate-discord-modal";
import { Button } from "./intentui/button";

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
