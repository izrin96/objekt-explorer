import { DiscordLogoIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useFilterData } from "@/features/filters/filter-data-provider";
import { m } from "@/paraglide/messages";

import { EMPTY_CHOICES, joinSections, toFormatOptions } from "./choices";
import { ChoicesFields, FLAGS, FormattedText } from "./choices-fields";
import { format } from "./format";

// the on-screen set has no saved list to link to
const VISITOR_FLAGS = FLAGS.filter((flag) => flag.key !== "includeLink");

/**
 * Formats whatever is on screen right now — the filtered set, not a saved list
 * — so any visitor can export the collection they are looking at. The owner's
 * have/want generator is `DiscordFormatDialog` in `discord-format-dialog.tsx`.
 */
export function GenerateDiscordButton({
  objekts,
  rules,
}: {
  objekts: ValidObjekt[];
  /** a want list's rule lines; they make the text a Want section and come first */
  rules?: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <DiscordLogoIcon weight="fill" />
        {m.discord_format_modal_button()}
      </Button>
      <GenerateDiscordDialog objekts={objekts} rules={rules} open={open} onOpenChange={setOpen} />
    </>
  );
}

function GenerateDiscordDialog({
  objekts,
  rules,
  open,
  onOpenChange,
}: {
  objekts: ValidObjekt[];
  rules?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { compareArtistMember } = useCosmoArtist();
  const { compareSeason } = useFilterData();
  const [choices, setChoices] = useState(EMPTY_CHOICES);
  const [text, setText] = useState("");

  const generate = () => {
    const formatted = format(objekts, toFormatOptions(choices, compareArtistMember, compareSeason));
    const section =
      rules === undefined
        ? { heading: "## Have", body: formatted }
        : { heading: "## Want", rules, body: objekts.length > 0 ? formatted : undefined };
    setText(joinSections([section], choices.bullet));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{m.discord_format_modal_title()}</DialogTitle>
          <DialogDescription>{m.discord_format_modal_description()}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <ChoicesFields
            idPrefix="generate-discord"
            flags={VISITOR_FLAGS}
            choices={choices}
            onChange={setChoices}
          />
          <FormattedText id="generate-discord-output" text={text} onTextChange={setText} />
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
          <Button
            variant="outline"
            onClick={() => {
              setChoices(EMPTY_CHOICES);
              setText("");
            }}
          >
            {m.generate_discord_reset_button()}
          </Button>
          <Button onClick={generate}>{m.discord_format_modal_generate()}</Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
