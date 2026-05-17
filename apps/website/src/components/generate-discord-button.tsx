import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useState } from "react";

import { m } from "@/paraglide/messages";

import GenerateDiscordFormatModal from "./generate-discord-modal";
import { Button } from "./intentui/button";

export function GenerateDiscordButton({ objekts }: { objekts: ValidObjekt[] }) {
  const [genOpen, setGenOpen] = useState(false);
  return (
    <>
      <GenerateDiscordFormatModal objekts={objekts} open={genOpen} setOpen={setGenOpen} />
      <Button intent="outline" onPress={() => setGenOpen(true)}>
        {m.discord_format_modal_button()}
      </Button>
    </>
  );
}
