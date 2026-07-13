import { useCallback } from "react";
import type { Key } from "react-aria-components";
import { Autocomplete, useFilter } from "react-aria-components/Autocomplete";
import { Popover } from "react-aria-components/Popover";

import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Dialog } from "../intentui/dialog";
import { ListBox } from "../intentui/list-box";
import { SearchField, SearchInput } from "../intentui/search-field";
import { Select, SelectItem, SelectSection } from "../intentui/select";

export default function MemberFilter() {
  const { contains } = useFilter({ sensitivity: "base" });
  const { selectedArtists } = useCosmoArtist();
  const [filters, setFilters] = useFilters();
  const selected = filters.member ?? [];

  const update = useCallback((value: Key[]) => {
    return setFilters({
      member: value.length > 0 ? (value as string[]) : null,
      artist: null,
    });
  }, []);

  return (
    <Select
      selectionMode="multiple"
      value={selected}
      onChange={update}
      placeholder={m.filter_member()}
      aria-label={m.filter_member()}
      className="w-fit"
    >
      <Button intent="outline" data-selected={filters.member}>
        {m.filter_member()}
      </Button>
      <Popover className="entering:fade-in exiting:fade-out entering:animate-in exiting:animate-out bg-overlay flex max-h-80 w-(--trigger-width) min-w-52 flex-col overflow-hidden rounded-lg border">
        <Dialog aria-label={m.filter_member()}>
          <Autocomplete filter={contains}>
            <div className="border-b py-0.5">
              <SearchField className="rounded-lg focus-within:ring-0" autoFocus>
                <SearchInput className="border-none ring-0 focus:ring-0" />
              </SearchField>
            </div>
            <ListBox
              shouldFocusWrap
              className="max-h-[inherit] min-w-[inherit] rounded-t-none border-0 bg-transparent shadow-none"
            >
              {selectedArtists.map((artist) => (
                <SelectSection key={artist.name} title={artist.title} id={artist.name}>
                  {artist.artistMembers.map((member) => (
                    <SelectItem
                      key={member.name}
                      id={member.name}
                      textValue={
                        artist.name === "artms" ? member.name : `${member.alias} ${member.name}`
                      }
                    >
                      {artist.name === "artms" ? member.name : `${member.alias} ${member.name}`}
                    </SelectItem>
                  ))}
                </SelectSection>
              ))}
            </ListBox>
          </Autocomplete>
        </Dialog>
      </Popover>
    </Select>
  );
}
