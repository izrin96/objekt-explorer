import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { type Ref, useRef, useState } from "react";
import { flushSync } from "react-dom";

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
import { ListLabel } from "@/features/list/list-option";
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
const ERROR_ID = "discord-lists-error";

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
  const [tried, setTried] = useState(false);
  const havePicker = useRef<HTMLButtonElement>(null);
  const missing = tried && picked.haveList === NONE && picked.wantList === NONE;

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
      // the error must exist before focus lands, so the picker reads it out
      flushSync(() => setTried(true));
      havePicker.current?.focus();
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
          <DialogDescription>{m.generate_discord_desc()}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <ListPicker
            ref={havePicker}
            id="discord-have"
            label={m.generate_discord_have_list_label()}
            value={picked.haveList}
            lists={lists}
            invalid={missing}
            onValueChange={(next) => setPicked({ ...picked, haveList: next })}
          />
          <ListPicker
            id="discord-want"
            label={m.generate_discord_want_list_label()}
            value={picked.wantList}
            lists={lists}
            invalid={missing}
            onValueChange={(next) => setPicked({ ...picked, wantList: next })}
          />
          {missing ? (
            <p id={ERROR_ID} role="alert" className="text-destructive-foreground -mt-2 text-xs">
              {m.generate_discord_select_at_least_one()}
            </p>
          ) : null}

          <ChoicesFields flags={FLAGS} choices={choices} onChange={setChoices} />
          <FormattedText id="discord-output" text={text} onTextChange={setText} />
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
          <Button
            variant="outline"
            onClick={() => {
              setPicked(EMPTY_LISTS);
              setTried(false);
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
  ref,
  id,
  label,
  value,
  lists,
  invalid,
  onValueChange,
}: {
  ref?: Ref<HTMLButtonElement>;
  id: string;
  label: string;
  value: string;
  lists: ReturnType<typeof useUserLists>;
  invalid: boolean;
  onValueChange: (next: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next: string | null) => onValueChange(next ?? NONE)}>
        <SelectTrigger
          ref={ref}
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? ERROR_ID : undefined}
          className="min-w-0"
        >
          <SelectValue>
            {(next: string) => {
              const list = lists.find((entry) => entry.slug === next);
              return list ? (
                <ListLabel name={list.name} type={list.listType} />
              ) : (
                m.generate_discord_list_placeholder()
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectPopup>
          <SelectItem value={NONE}>{m.generate_discord_list_placeholder()}</SelectItem>
          {lists.map((list) => (
            <SelectItem key={list.slug} value={list.slug} label={list.name}>
              <ListLabel name={list.name} type={list.listType} />
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </div>
  );
}
