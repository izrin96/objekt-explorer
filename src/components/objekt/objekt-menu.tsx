"use client";

import { useProfile } from "@/hooks/use-profile";
import { useListAuthed } from "@/hooks/use-user";
import { ValidObjekt } from "@/lib/universal/objekts";
import { Button, Loader, Menu } from "../ui";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/trpc/client";

export function ObjektMenu({ objekt }: { objekt: ValidObjekt }) {
  const list = useProfile((a) => a.list);
  const isOwned = useListAuthed(list?.slug);

  if (!isOwned) return;

  return (
    <Menu>
      <Button
        className="absolute top-1 sm:top-1.5 p-2 right-10 z-50"
        size="extra-small"
        intent="outline"
      >
        <DotsThreeVerticalIcon size={14} />
      </Button>
      <Menu.Content respectScreen={false} placement="bottom right">
        {list ? (
          <RemoveFromListMenu slug={list.slug} objekt={objekt} />
        ) : (
          <AddToListMenu objekt={objekt} />
        )}
      </Menu.Content>
    </Menu>
  );
}

function AddToListMenu({ objekt }: { objekt: ValidObjekt }) {
  const { data, isLoading } = api.list.myList.useQuery();
  const addToList = api.list.addObjektsToList.useMutation({
    onSuccess: (rowCount) => {
      toast.success(`${rowCount} objekt added to the list`, {
        duration: 1300,
      });
    },
    onError: () => {
      toast.error("Error adding objekt to list");
    },
  });
  const items = data ?? [];

  const handleAction = useCallback(
    (slug: string) => {
      addToList.mutate({
        slug: slug,
        skipDups: false,
        collectionSlugs: [objekt.slug],
      });
    },
    [objekt, addToList]
  );
  return (
    <Menu.Submenu>
      <Menu.Item>Add to list</Menu.Item>
      <Menu.Content respectScreen={false} placement="bottom right">
        {isLoading && (
          <Menu.Item isDisabled>
            <Menu.Label>
              <Loader variant="ring" />
            </Menu.Label>
          </Menu.Item>
        )}
        {!isLoading && items.length === 0 && (
          <Menu.Item isDisabled>
            <Menu.Label>
              <span>No list found</span>
            </Menu.Label>
          </Menu.Item>
        )}
        {items.map((a) => (
          <Menu.Item key={a.slug} onAction={() => handleAction(a.slug)}>
            <Menu.Label>{a.name}</Menu.Label>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Submenu>
  );
}

function RemoveFromListMenu({
  slug,
  objekt,
}: {
  slug: string;
  objekt: ValidObjekt;
}) {
  const utils = api.useUtils();
  const removeObjektsFromList = api.list.removeObjektsFromList.useMutation({
    onSuccess: () => {
      utils.list.getEntries.invalidate(slug);
      toast.success("Objekt removed from the list", {
        duration: 1300,
      });
    },
    onError: () => {
      toast.error("Error removing objekt from list");
    },
  });

  return (
    <Menu.Item
      onAction={() =>
        removeObjektsFromList.mutate({
          slug: slug,
          ids: [Number(objekt.id)],
        })
      }
    >
      Remove from list
    </Menu.Item>
  );
}
