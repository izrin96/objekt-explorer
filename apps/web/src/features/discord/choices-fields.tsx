import { CopyButton } from "@/components/shared/copy-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { m } from "@/paraglide/messages";

import { type FormatChoices, type FormatFlag, withGroupBy } from "./choices";
import type { FormatStyle, GroupByMode } from "./format";

export const FLAGS: { key: FormatFlag; label: () => string }[] = [
  { key: "showCount", label: m.generate_discord_show_count },
  { key: "includeLink", label: m.generate_discord_include_link },
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

/** The format checkboxes and the group-by and style selects both Discord dialogs share. */
export function ChoicesFields({
  idPrefix,
  flags,
  choices,
  onChange,
}: {
  idPrefix: string;
  flags: typeof FLAGS;
  choices: FormatChoices;
  onChange: (next: FormatChoices) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {flags.map((flag) => (
          <Label
            key={flag.key}
            htmlFor={`${idPrefix}-${flag.key}`}
            className="flex items-center gap-2 text-sm font-normal"
          >
            <Checkbox
              id={`${idPrefix}-${flag.key}`}
              checked={choices[flag.key]}
              onCheckedChange={(checked) => onChange({ ...choices, [flag.key]: checked })}
            />
            {flag.label()}
          </Label>
        ))}
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-group-by`}>{m.generate_discord_group_by_label()}</Label>
          <Select
            value={choices.groupBy}
            onValueChange={(next: GroupByMode | null) => onChange(withGroupBy(choices, next))}
          >
            <SelectTrigger id={`${idPrefix}-group-by`} className="min-w-0">
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
          <Label htmlFor={`${idPrefix}-style`}>{m.generate_discord_style_label()}</Label>
          <Select
            value={choices.style}
            disabled={choices.groupBy === "none"}
            onValueChange={(next: FormatStyle | null) =>
              onChange({ ...choices, style: next ?? "default" })
            }
          >
            <SelectTrigger id={`${idPrefix}-style`} className="min-w-0">
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
    </>
  );
}

export function FormattedText({
  id,
  text,
  onTextChange,
}: {
  id: string;
  text: string;
  onTextChange: (text: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{m.generate_discord_formatted_text_label()}</Label>
        <CopyButton
          text={text}
          label={m.common_copy_button()}
          toastTitle={m.common_copy_copied()}
        />
      </div>
      <Textarea
        id={id}
        value={text}
        rows={8}
        className="max-h-64 text-xs"
        onChange={(event) => onTextChange(event.target.value)}
      />
    </div>
  );
}
