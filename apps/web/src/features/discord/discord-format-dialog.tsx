import { DiscordLogoIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { CopyButton } from "@/components/shared/copy-button";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
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
import { toastManager } from "@/components/ui/toast";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useFilterData } from "@/features/filters/filter-data-provider";
import { getListLinkOption } from "@/features/list/list-link";
import { LIST_TYPE_LABEL } from "@/features/list/list-type-badge";
import { useUserLists } from "@/features/user/hooks";
import { orpc } from "@/lib/orpc";
import { getBaseURL } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { type FormatStyle, type GroupByMode, format } from "./format";

const NONE = "__none__";

type Flag =
  | "showCount"
  | "includeLink"
  | "lowercaseCollection"
  | "bullet"
  | "showMemberEmoji"
  | "hideType";

const FLAGS: { key: Flag; label: () => string }[] = [
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

const EMPTY_OPTIONS = {
  haveList: NONE,
  wantList: NONE,
  showCount: false,
  includeLink: false,
  lowercaseCollection: false,
  bullet: false,
  showMemberEmoji: false,
  hideType: false,
  groupBy: "none" as GroupByMode,
  style: "default" as FormatStyle,
};

export function DiscordFormatButton({ size = "sm" }: { size?: ButtonProps["size"] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size={size} onClick={() => setOpen(true)}>
        <DiscordLogoIcon weight="fill" />
        {m.nav_discord_format()}
      </Button>
      <DiscordFormatDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function DiscordFormatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const lists = useUserLists();
  const router = useRouter();
  const { compareArtistMember } = useCosmoArtist();
  const { compareSeason } = useFilterData();
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [text, setText] = useState("");

  const generate = useMutation(
    orpc.list.generateDiscordFormat.mutationOptions({
      onError: ({ message }) => {
        toastManager.add({
          type: "error",
          title: m.generate_discord_error(),
          description: message,
        });
      },
    }),
  );

  const set = (patch: Partial<typeof EMPTY_OPTIONS>) => setOptions({ ...options, ...patch });

  const listUrl = (slug: string) => {
    const list = lists.find((entry) => entry.slug === slug);
    if (!list) return null;
    return new URL(router.buildLocation(getListLinkOption(list)).href, getBaseURL()).toString();
  };

  const submit = () => {
    const haveListSlug = options.haveList === NONE ? undefined : options.haveList;
    const wantListSlug = options.wantList === NONE ? undefined : options.wantList;

    if (!haveListSlug && !wantListSlug) {
      toastManager.add({ type: "error", title: m.generate_discord_select_at_least_one() });
      return;
    }

    generate.mutate(
      { haveListSlug, wantListSlug },
      {
        onSuccess: ({ have, want }) => {
          const formatOptions = {
            showQuantity: options.showCount,
            lowercaseCollection: options.lowercaseCollection,
            bullet: options.bullet,
            showMemberEmoji: options.showMemberEmoji,
            hideType: options.hideType,
            groupByMode: options.groupBy,
            style: options.style,
            compareArtistMember,
            compareSeason,
          };
          const output: string[] = [];

          const section = (heading: string, rows: typeof have, slug: string | undefined) => {
            if (!slug || rows.length === 0) return;
            if (output.length > 0) output.push("");
            output.push(heading, "", format(rows, formatOptions));
            const url = options.includeLink ? listUrl(slug) : null;
            if (url) output.push("", `[${m.list_share()}](<${url}>)`);
          };

          section("## Have", have, haveListSlug);
          section("## Want", want, wantListSlug);
          setText(output.join("\n"));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{m.generate_discord_title()}</DialogTitle>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <ListPicker
            id="discord-have"
            label={m.generate_discord_have_list_label()}
            value={options.haveList}
            lists={lists}
            onValueChange={(next) => set({ haveList: next })}
          />
          <ListPicker
            id="discord-want"
            label={m.generate_discord_want_list_label()}
            value={options.wantList}
            lists={lists}
            onValueChange={(next) => set({ wantList: next })}
          />

          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {FLAGS.map((flag) => (
              <Label
                key={flag.key}
                htmlFor={`discord-${flag.key}`}
                className="flex items-center gap-2 text-sm font-normal"
              >
                <Checkbox
                  id={`discord-${flag.key}`}
                  checked={options[flag.key]}
                  onCheckedChange={(checked) => set({ [flag.key]: checked })}
                />
                {flag.label()}
              </Label>
            ))}
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="discord-group-by">{m.generate_discord_group_by_label()}</Label>
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
                <SelectTrigger id="discord-group-by" className="min-w-0">
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
              <Label htmlFor="discord-style">{m.generate_discord_style_label()}</Label>
              <Select
                value={options.style}
                disabled={options.groupBy === "none"}
                onValueChange={(next: FormatStyle | null) => set({ style: next ?? "default" })}
              >
                <SelectTrigger id="discord-style" className="min-w-0">
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
              <Label htmlFor="discord-output">{m.generate_discord_formatted_text_label()}</Label>
              <CopyButton
                text={text}
                label={m.common_copy_button()}
                toastTitle={m.common_copy_copied()}
              />
            </div>
            <Textarea
              id="discord-output"
              value={text}
              rows={8}
              className="max-h-64 font-mono text-xs"
              onChange={(event) => setText(event.target.value)}
            />
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
          <Button
            variant="outline"
            onClick={() => {
              setOptions(EMPTY_OPTIONS);
              setText("");
            }}
          >
            {m.generate_discord_reset_button()}
          </Button>
          <Button loading={generate.isPending} onClick={submit}>
            {m.generate_discord_generate_button()}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function ListPicker({
  id,
  label,
  value,
  lists,
  onValueChange,
}: {
  id: string;
  label: string;
  value: string;
  lists: ReturnType<typeof useUserLists>;
  onValueChange: (next: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next: string | null) => onValueChange(next ?? NONE)}>
        <SelectTrigger id={id} className="min-w-0">
          <SelectValue>
            {(next: string) =>
              next === NONE
                ? m.generate_discord_list_placeholder()
                : (lists.find((list) => list.slug === next)?.name ?? next)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectPopup>
          <SelectItem value={NONE}>{m.generate_discord_list_placeholder()}</SelectItem>
          {lists.map((list) => (
            <SelectItem key={list.slug} value={list.slug}>
              <span className="truncate">{list.name}</span>
              <span className="text-muted-foreground ml-1.5 text-xs">
                {LIST_TYPE_LABEL[list.listTypeNew]()}
              </span>
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </div>
  );
}
