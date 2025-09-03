"use client";

import { useRouter } from "@bprogress/next/app";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useMemo, useTransition } from "react";
import type { Selection } from "react-aria-components";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { orpc } from "@/lib/orpc/client";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import { parseSelected } from "@/lib/utils";
import { Avatar, Button, Menu } from "../ui";

export default function SelectedArtistFilter() {
  const router = useRouter();
  const { artists, selectedArtistIds, selectedArtists } = useCosmoArtist();
  const [isPending, startTransition] = useTransition();
  const selected = useMemo(() => new Set(selectedArtistIds), [selectedArtistIds]);
  const setArtists = useMutation(orpc.config.setArtists.mutationOptions());

  const update = useCallback((key: Selection) => {
    startTransition(async () => {
      const value = parseSelected<ValidArtist>(key, true);
      await setArtists.mutateAsync(value ?? []);
      router.refresh();
    });
  }, []);

  return (
    <Menu>
      <Button intent="outline" size="sm" className="px-2 sm:px-2">
        <div className="-space-x-2 flex items-center justify-center">
          {selectedArtists.map((artist) => (
            <Avatar
              key={artist.name}
              src={artist.logoImageUrl}
              className="size-5 ring-2 ring-bg *:size-5"
            />
          ))}
        </div>
      </Button>
      <Menu.Content selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {artists.map((item) => (
          <Menu.Item key={item.name} isDisabled={isPending} id={item.name} textValue={item.title}>
            <Menu.Label>{item.title}</Menu.Label>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu>
  );
}
