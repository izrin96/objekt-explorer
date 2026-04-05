"use client";

import type { CosmoPublicUser } from "@repo/cosmo/types/user";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";
import { useDebounceValue } from "usehooks-ts";

import { Description, FieldError, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ListBox, ListBoxItem, ListBoxSection } from "@/components/ui/list-box";
import { TextField } from "@/components/ui/text-field";
import { useUserProfiles } from "@/hooks/use-user";
import { getBaseURL } from "@/lib/utils";

type Profile = {
  address: string;
  nickname: string | null;
};

type ProfileSelectorProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  rules?: RegisterOptions<T, Path<T>>;
  disabled?: boolean;
};

function truncateAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

function getDisplayName(profile: Profile): string {
  return profile.nickname || truncateAddress(profile.address);
}

export function ProfileSelector<T extends FieldValues>({
  control,
  name,
  rules,
}: ProfileSelectorProps<T>) {
  const {
    field: { onChange, onBlur },
    fieldState: { invalid, error },
  } = useController({
    name,
    control,
    rules,
  });

  const [inputValue, setInputValue] = useState("");
  const [selectedProfileDisplay, setSelectedProfileDisplay] = useState<string | null>(null);

  const [debouncedQuery] = useDebounceValue(inputValue, 300);
  const { data: linkedProfiles, isLoading: isLoadingLinked } = useUserProfiles();

  const enableSearch = debouncedQuery.length > 0;

  const { data: searchResults, isLoading: isLoadingSearch } = useQuery({
    queryKey: ["profile-search", debouncedQuery],
    queryFn: async () => {
      const url = new URL("/api/user/search", getBaseURL());
      const response = await fetch(`${url.toString()}?query=${encodeURIComponent(debouncedQuery)}`);
      const data = (await response.json()) as { results: CosmoPublicUser[] };
      return data.results;
    },
    enabled: enableSearch,
  });

  const isLoading = isLoadingLinked || (enableSearch && isLoadingSearch);

  const linkedProfilesData: Profile[] = linkedProfiles ?? [];

  const searchResultsData: Profile[] = (searchResults ?? []).map((user) => ({
    address: user.address,
    nickname: user.nickname,
  }));

  const showListBox =
    (!enableSearch && linkedProfilesData.length > 0) ||
    (enableSearch && (searchResultsData.length > 0 || isLoading));

  const handleSelectionChange = (profile: Profile) => {
    onChange(profile.address);
    setSelectedProfileDisplay(profile.nickname!);
    setInputValue("");
  };

  return (
    <div className="flex flex-col gap-2">
      <TextField
        isRequired
        name={name}
        value={selectedProfileDisplay || inputValue}
        onChange={(value) => {
          setInputValue(value);
          if (value) {
            setSelectedProfileDisplay(null);
          }
        }}
        onBlur={onBlur}
        isInvalid={invalid}
        validationBehavior="aria"
      >
        <Label>Profile</Label>
        <Description>Select a Cosmo profile to compare with</Description>
        <Input placeholder="Enter Cosmo profile" />
        <FieldError>{error?.message}</FieldError>
      </TextField>

      {showListBox && (
        <ListBox className="pb-2" aria-label="Profile search list">
          {!enableSearch && linkedProfilesData.length > 0 && (
            <ListBoxSection title="Linked Profiles">
              {linkedProfilesData.map((profile) => (
                <ListBoxItem
                  key={profile.address}
                  id={profile.address}
                  textValue={getDisplayName(profile)}
                  onAction={() => handleSelectionChange(profile)}
                >
                  {getDisplayName(profile)}
                </ListBoxItem>
              ))}
            </ListBoxSection>
          )}
          {enableSearch && searchResultsData.length > 0 && (
            <ListBoxSection title="Search Results">
              {searchResultsData.map((profile) => (
                <ListBoxItem
                  key={profile.address}
                  id={profile.address}
                  textValue={getDisplayName(profile)}
                  onAction={() => handleSelectionChange(profile)}
                >
                  {getDisplayName(profile)}
                </ListBoxItem>
              ))}
            </ListBoxSection>
          )}
          {!enableSearch && linkedProfilesData.length === 0 && !isLoading && (
            <ListBoxItem isDisabled id="no-profiles">
              No linked profiles found
            </ListBoxItem>
          )}
          {enableSearch && searchResultsData.length === 0 && !isLoading && (
            <ListBoxItem isDisabled id="no-results">
              No profiles found
            </ListBoxItem>
          )}
        </ListBox>
      )}
    </div>
  );
}
