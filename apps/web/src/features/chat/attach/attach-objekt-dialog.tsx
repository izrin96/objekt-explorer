import { LinkIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { type RefObject, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Sheet, SheetDescription, SheetPopup, SheetTitle } from "@/components/ui/sheet";
import type { Attachment } from "@/features/chat/attachment";
import { NO_PICKER_FILTERS, PickerFilterBar } from "@/features/filters/picker-filter-bar";
import { SingleSelect } from "@/features/filters/single-select";
import { listOption } from "@/features/list/list-option";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
import { displayNickname } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { ListGrid } from "./attach-list-grid";
import { OwnedGrid } from "./attach-owned-grid";

export function AttachObjektDialog({
  open,
  onOpenChange,
  onPick,
  finalFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (attachment: Attachment) => void;
  /** where focus goes on close, after a pick or not */
  finalFocus?: RefObject<HTMLElement | null>;
}) {
  const pick = (attachment: Attachment) => {
    onPick(attachment);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* New post's Add objekts sheet: a set height gives the grid a bounded scroller, so it
          stays virtualised; a phone takes all but the viewport's top gap */}
      <SheetPopup
        side="bottom"
        finalFocus={finalFocus}
        className="h-[88dvh] max-sm:h-[calc(100dvh-(--spacing(12)))]"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <SheetTitle className="font-display pe-8 text-lg">{m.chat_attach_title()}</SheetTitle>
            {/* a phone needs the room for the grid; screen readers still get it */}
            <SheetDescription className="text-pretty max-md:sr-only">
              {m.chat_attach_description()}
            </SheetDescription>
          </div>
          <AttachPicker onPick={pick} />
        </div>
      </SheetPopup>
    </Sheet>
  );
}

/** Where the cards come from: one of the viewer's profiles, or one of their lists. */
type Source = `profile:${string}` | `list:${string}`;

function AttachPicker({ onPick }: { onPick: (attachment: Attachment) => void }) {
  const profiles = useUserProfiles();
  const lists = useUserLists();
  const [picked, setPicked] = useState<Source | null>(null);
  const [filters, setFilters] = useState(NO_PICKER_FILTERS);

  const options = [
    ...profiles.map((p) => ({
      value: `profile:${p.address}` as Source,
      label: displayNickname(p.address, p.nickname),
      group: m.chat_attach_objekts(),
    })),
    ...lists.map((l) => ({
      ...listOption({ slug: l.slug, name: l.name, type: l.listType }),
      value: `list:${l.slug}` as Source,
      group: m.chat_attach_lists(),
    })),
  ];
  // a pick that left (an unlinked profile, a deleted list) falls back to the first source
  const source = options.find((o) => o.value === picked) ?? options[0];

  if (!source) {
    return (
      <EmptyState
        icon={LinkIcon}
        bordered={false}
        title={m.chat_attach_no_profile()}
        action={
          <Button variant="outline" size="sm" render={<Link to="/account/profiles" />}>
            {m.link_link_cosmo()}
          </Button>
        }
      />
    );
  }

  const isList = source.value.startsWith("list:");
  const id = source.value.slice(source.value.indexOf(":") + 1);
  const list = isList ? lists.find((l) => l.slug === id) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PickerFilterBar
        filters={filters}
        onChange={setFilters}
        pinSource
        source={
          <SingleSelect
            label={isList ? m.chat_attach_list_label() : m.chat_attach_profile_label()}
            options={options}
            value={source.value}
            defaultValue={source.value}
            showValue
            onChange={setPicked}
          />
        }
      />
      {list ? (
        <ListGrid
          key={source.value}
          slug={list.slug}
          name={list.name}
          filters={filters}
          onPick={onPick}
        />
      ) : (
        <OwnedGrid key={source.value} address={id} filters={filters} onPick={onPick} />
      )}
    </div>
  );
}
