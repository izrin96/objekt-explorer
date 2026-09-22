import { DiscordLogoIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useState } from "react";

import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useFilterData } from "@/features/filters/filter-data-provider";
import { m } from "@/paraglide/messages";

import { type FormatStyle, type GroupByMode, format } from "./format";

type Flag = "showCount" | "lowercaseCollection" | "bullet" | "showMemberEmoji" | "hideType";

const FLAGS: { key: Flag; label: () => string }[] = [
  { key: "showCount", label: m.generate_discord_show_count },
  { key: "lowercaseCollection", label: m.generate_discord_lower_case },
  { key: "bullet", label: m.generate_discord_bulleted_list },
  { key: "showMemberEmoji", label: m.generate_discord_show_member_emoji },
  { key: "hideType", label: m.generate_discord_hide_type },
];

const GROUP_BY: { value: GroupByMode; label: () => string }[] = [
  { value: "none", label: m.generate_discord_group_by_none },
  { value: "season", label: m.generate_discord_group_by_season },
  { value: "season-first", label: m.generate_discord_group_by_season_first },
];

const STYLES: { value: FormatStyle; label: () => string }[] = [
  { value: "default", label: m.generate_discord_style_default },
  { value: "compact", label: m.generate_discord_style_compact },
];

const EMPTY_OPTIONS = {
  showCount: false,
  lowercaseCollection: false,
  bullet: false,
  showMemberEmoji: false,
  hideType: false,
  groupBy: "none" as GroupByMode,
  style: "default" as FormatStyle,
};

/**
 * Formats whatever is on screen right now — the filtered set, not a saved list
 * — so any visitor can export the collection they are looking at. The owner's
 * have/want generator is `DiscordFormatDialog` in `discord-format-dialog.tsx`.
 */
export function GenerateDiscordButton({ objekts }: { objekts: ValidObjekt[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-[13px]"
        onClick={() => setOpen(true)}
      >
        <DiscordLogoIcon weight="fill" />
        {m.discord_format_modal_button()}
      </Button>
      <GenerateDiscordDialog objekts={objekts} open={open} onOpenChange={setOpen} />
    </>
  );
}

function GenerateDiscordDialog({
  objekts,
  open,
  onOpenChange,
}: {
  objekts: ValidObjekt[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { compareArtistMember } = useCosmoArtist();
  const { compareSeason } = useFilterData();
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [text, setText] = useState("");

  const set = (patch: Partial<typeof EMPTY_OPTIONS>) => setOptions({ ...options, ...patch });

  const generate = () => {
    const formatted = format(objekts, {
      showQuantity: options.showCount,
      lowercaseCollection: options.lowercaseCollection,
      bullet: options.bullet,
      showMemberEmoji: options.showMemberEmoji,
      hideType: options.hideType,
      groupByMode: options.groupBy,
      style: options.style,
      compareArtistMember,
      compareSeason,
    });
    setText(["## Have", "", formatted].join("\n"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{m.discord_format_modal_title()}</DialogTitle>
          <DialogDescription>{m.discord_format_modal_description()}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {FLAGS.map((flag) => (
              <Label
                key={flag.key}
                htmlFor={`generate-discord-${flag.key}`}
                className="flex items-center gap-2 text-sm font-normal"
              >
                <Checkbox
                  id={`generate-discord-${flag.key}`}
                  checked={options[flag.key]}
                  onCheckedChange={(checked) => set({ [flag.key]: checked })}
                />
                {flag.label()}
              </Label>
            ))}
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="generate-discord-group-by">
                {m.generate_discord_group_by_label()}
              </Label>
              <Select
                value={options.groupBy}
                onValueChange={(next: GroupByMode | null) =>
                  set({
                    groupBy: next ?? "none",
                    // compact only differs once there is a grouping to compact
                    style: next === "none" || next === null ? "default" : options.style,
                  })
                }
              >
                <SelectTrigger id="generate-discord-group-by" className="min-w-0">
                  <SelectValue>
                    {(value: GroupByMode) =>
                      GROUP_BY.find((entry) => entry.value === value)?.label() ?? value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {GROUP_BY.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label()}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="generate-discord-style">{m.generate_discord_style_label()}</Label>
              <Select
                value={options.style}
                disabled={options.groupBy === "none"}
                onValueChange={(next: FormatStyle | null) => set({ style: next ?? "default" })}
              >
                <SelectTrigger id="generate-discord-style" className="min-w-0">
                  <SelectValue>
                    {(value: FormatStyle) =>
                      STYLES.find((entry) => entry.value === value)?.label() ?? value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {STYLES.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label()}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="generate-discord-output">
                {m.generate_discord_formatted_text_label()}
              </Label>
              <CopyButton
                text={text}
                label={m.common_copy_button()}
                toastTitle={m.common_copy_copied()}
              />
            </div>
            <Textarea
              id="generate-discord-output"
              value={text}
              rows={8}
              className="max-h-64 font-mono text-xs"
              onChange={(event) => setText(event.target.value)}
            />
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
          <Button
            variant="outline"
            onClick={() => {
              setOptions(EMPTY_OPTIONS);
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
