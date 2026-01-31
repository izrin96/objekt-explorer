"use client";

import type { ValidArtist } from "@repo/cosmo/types/common";
import type { Selection } from "react-aria-components";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { orpc } from "@/lib/orpc/client";

import { Avatar } from "../ui/avatar-custom";
import { Button } from "../ui/button";
import { Loader } from "../ui/loader";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../ui/menu";

export default function SelectedArtistFilter() {
  const router = useRouter();
  const { artists, selectedArtistIds, selectedArtists } = useCosmoArtist();
  const [isPending, startTransition] = useTransition();
  const selected = new Set(selectedArtistIds);
  const setArtists = useMutation(orpc.config.setArtists.mutationOptions());

  const update = useCallback((key: Selection) => {
    startTransition(async () => {
      const values = Array.from((key as Set<ValidArtist>).values());
      await setArtists.mutateAsync(values);
      router.refresh();
    });
  }, []);

  return (
    <Menu>
      <Button aria-label="Selected artist" intent="plain" size="sm" className="px-1.5 sm:px-1.5">
        {isPending ? (
          <Loader variant="ring" />
        ) : (
          <div className="flex items-center justify-center -space-x-2">
            {selectedArtists.map((artist) => (
              <Avatar
                key={artist.name}
                src={artist.logoImageUrl}
                className="ring-bg size-5 ring-2 *:size-5"
              />
            ))}
          </div>
        )}
      </Button>
      <MenuContent selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {artists.map((item) => (
          <MenuItem key={item.name} isDisabled={isPending} id={item.name} textValue={item.title}>
            <MenuLabel>{item.title}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
