"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";

import { useState } from "react";

import GenerateDiscordFormatModal from "./generate-discord-modal";
import { Button } from "./ui/button";

export function GenerateDiscordButton({ objekts }: { objekts: ValidObjekt[] }) {
  const [genOpen, setGenOpen] = useState(false);
  return (
    <>
      <GenerateDiscordFormatModal objekts={objekts} open={genOpen} setOpen={setGenOpen} />
      <Button intent="outline" onClick={() => setGenOpen(true)}>
        Discord format
      </Button>
    </>
  );
}
