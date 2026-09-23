import { NoteIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { m } from "@/paraglide/messages";

export function ObjektNote({ note }: { note: string }) {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-xs" aria-label={m.objekt_note_aria()} />}
      >
        <NoteIcon />
      </PopoverTrigger>
      <PopoverPopup padding="sm" className="max-w-64 text-sm">
        <span className="text-muted-foreground">{m.objekt_note()}: </span>
        {note}
      </PopoverPopup>
    </Popover>
  );
}
