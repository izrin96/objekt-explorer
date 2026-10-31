import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
import { toastManager } from "@/components/ui/toast";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useFilterData } from "@/features/filters/filter-data-provider";
import { getListLinkOption } from "@/features/list/list-link";
import { LIST_TYPE_LABEL } from "@/features/list/list-type-badge";
import { useUserLists } from "@/features/user/hooks";
import { orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { getBaseURL } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { EMPTY_CHOICES, type Section, joinSections, toFormatOptions } from "./choices";
import { ChoicesFields, FLAGS, FormattedText } from "./choices-fields";
import { format } from "./format";

const NONE = "__none__";

const EMPTY_LISTS = { haveList: NONE, wantList: NONE };

/** The owner's generator: it builds from saved have/want lists, opened from the user menu and `/list`. */
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
  const [picked, setPicked] = useState(EMPTY_LISTS);
  const [choices, setChoices] = useState(EMPTY_CHOICES);
  const [text, setText] = useState("");

  const generate = useMutation(
    orpc.list.generateDiscordFormat.mutationOptions({
      onError: (error) => {
        toastManager.add({
          type: "error",
          title: m.generate_discord_error(),
          description: refusalText(error),
        });
      },
    }),
  );

  const listUrl = (slug: string) => {
    const list = lists.find((entry) => entry.slug === slug);
    if (!list) return null;
    return new URL(router.buildLocation(getListLinkOption(list)).href, getBaseURL()).toString();
  };

  const submit = () => {
    const haveListSlug = picked.haveList === NONE ? undefined : picked.haveList;
    const wantListSlug = picked.wantList === NONE ? undefined : picked.wantList;

    if (!haveListSlug && !wantListSlug) {
      toastManager.add({ type: "error", title: m.generate_discord_select_at_least_one() });
      return;
    }

    generate.mutate(
      { haveListSlug, wantListSlug },
      {
        onSuccess: ({ have, want, wantRules }) => {
          const formatOptions = toFormatOptions(choices, compareArtistMember, compareSeason);
          const sections: Section[] = [];
          const add = (heading: string, rows: typeof have, slug?: string, rules: string[] = []) => {
            if (!slug || (rows.length === 0 && rules.length === 0)) return;
            sections.push({
              heading,
              rules,
              body: rows.length > 0 ? format(rows, formatOptions) : undefined,
              url: choices.includeLink ? listUrl(slug) : null,
            });
          };
          add("## Have", have, haveListSlug);
          add("## Want", want, wantListSlug, wantRules);
          setText(joinSections(sections, choices.bullet));
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
            value={picked.haveList}
            lists={lists}
            onValueChange={(next) => setPicked({ ...picked, haveList: next })}
          />
          <ListPicker
            id="discord-want"
            label={m.generate_discord_want_list_label()}
            value={picked.wantList}
            lists={lists}
            onValueChange={(next) => setPicked({ ...picked, wantList: next })}
          />

          <ChoicesFields flags={FLAGS} choices={choices} onChange={setChoices} />
          <FormattedText id="discord-output" text={text} onTextChange={setText} />
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
          <Button
            variant="outline"
            onClick={() => {
              setPicked(EMPTY_LISTS);
              setChoices(EMPTY_CHOICES);
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
                {LIST_TYPE_LABEL[list.listType]()}
              </span>
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </div>
  );
}
