"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { Selection } from "react-aria-components";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { orpc } from "@/lib/orpc/client";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
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
