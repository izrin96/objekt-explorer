"use client";

import { CopyButton } from "@/components/copy-button";
import ErrorFallbackRender from "@/components/error-boundary";
import {
  Button,
  Checkbox,
  Modal,
  Select,
  Form,
  Textarea,
  Loader,
} from "@/components/ui";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { CollectionFormat } from "@/lib/server/api/routers/list";
import { api } from "@/lib/trpc/client";
import { getBaseURL } from "@/lib/utils";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { Suspense, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function GenerateDiscordFormatModal({ open, setOpen }: Props) {
  return (
    <Modal.Content isOpen={open} onOpenChange={setOpen}>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            onReset={reset}
            FallbackComponent={ErrorFallbackRender}
          >
            <Suspense
              fallback={
                <div className="flex justify-center py-2">
                  <Loader variant="ring" />
                </div>
              }
            >
              <Content />
            </Suspense>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </Modal.Content>
  );
}

function Content() {
  const formRef = useRef<HTMLFormElement>(null!);
  const [data] = api.list.myList.useSuspenseQuery();
  const [formatText, setFormatText] = useState("");
  const { artists } = useCosmoArtist();

  const generateDiscordFormat = api.list.generateDiscordFormat.useMutation({
    onError: () => {
      toast.error("Error generating Discord format");
    },
  });

  return (
    <>
      <Modal.Header>
        <Modal.Title>Generate Discord Format</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          className="flex flex-col gap-2"
          ref={formRef}
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const haveSlug = formData.get("haveSlug") as string;
            const wantSlug = formData.get("wantSlug") as string;
            const includeLink = formData.get("includeLink") === "on";
            const showCount = formData.get("showCount") === "on";

            generateDiscordFormat.mutate(
              {
                haveSlug,
                wantSlug,
              },
              {
                onSuccess: async (data) => {
                  const { have, want, collections } = data;
                  const artistsMembers = artists.flatMap(
                    (a) => a.artistMembers
                  );

                  // collections map for faster search
                  const collectionsMap = new Map(
                    collections.map((a) => [a.slug, a])
                  );

                  // get ordered member list from collection
                  const members = Object.values(
                    groupBy(collections, (a) => `${a.artist}-${a.member}`)
                  )
                    .toSorted(([a], [b]) => {
                      // order by member
                      const posA = artistsMembers.findIndex(
                        (p) => p.name === a.member
                      );
                      const posB = artistsMembers.findIndex(
                        (p) => p.name === b.member
                      );

                      return posA - posB;
                    })
                    .toSorted(([a], [b]) => {
                      // order by artist
                      const posA = artists.findIndex(
                        (p) => p.name === a.artist
                      );
                      const posB = artists.findIndex(
                        (p) => p.name === b.artist
                      );

                      return posA - posB;
                    })
                    .map(([a]) => a.member);

                  const haveCollections = mapCollectionByMember(
                    collectionsMap,
                    have,
                    members
                  );
                  const wantCollections = mapCollectionByMember(
                    collectionsMap,
                    want,
                    members
                  );

                  setFormatText(
                    [
                      "## Have",
                      ...format(haveCollections, showCount),
                      ...(includeLink
                        ? [
                            "",
                            `[View this list](<${getBaseURL()}/list/${haveSlug}>)`,
                            "", // give a little bit of spacing
                          ]
                        : []),
                      "## Want",
                      ...format(wantCollections, showCount),
                      ...(includeLink
                        ? [
                            "",
                            `[View this list](<${getBaseURL()}/list/${wantSlug}>)`,
                          ]
                        : []),
                    ].join("\n")
                  );
                },
              }
            );
          }}
        >
          <Select
            label="Have list"
            name="haveSlug"
            placeholder="Select a list"
            isRequired
          >
            <Select.Trigger />
            <Select.List items={data}>
              {(item) => (
                <Select.Option id={item.slug} textValue={item.slug}>
                  {item.name}
                </Select.Option>
              )}
            </Select.List>
          </Select>
          <Select
            label="Want list"
            name="wantSlug"
            placeholder="Select a list"
            isRequired
          >
            <Select.Trigger />
            <Select.List items={data}>
              {(item) => (
                <Select.Option id={item.slug} textValue={item.slug}>
                  {item.name}
                </Select.Option>
              )}
            </Select.List>
          </Select>
          <Checkbox label="Show count" name="showCount" />
          <Checkbox label="Include link" name="includeLink" />
          <Textarea
            label="Formatted discord text"
            value={formatText}
            onChange={setFormatText}
          />
          <div>
            <CopyButton text={formatText} />
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer className="flex justify-end">
        <Button
          type="submit"
          isPending={generateDiscordFormat.isPending}
          onClick={() => formRef.current.requestSubmit()}
        >
          Generate
        </Button>
      </Modal.Footer>
    </>
  );
}

function format(
  collectionMap: Map<string, CollectionFormat[]>,
  showQuantity: boolean
) {
  return Array.from(collectionMap.entries()).map(([member, collections]) => {
    const formatCollections = collections.map((collection) => {
      if (collection.artist === "idntt") {
        return `${collection.season} ${collection.collectionNo}`;
      }
      const seasonCode = collection.season.charAt(0);
      const seasonNumber = collection.season.slice(-2);
      const seasonFormat = seasonCode.repeat(parseInt(seasonNumber));

      return `${seasonFormat}${collection.collectionNo}`;
    });

    const groupedFormat = groupBy(formatCollections, (a) => a);

    const formattedWithQuantity = Object.entries(groupedFormat)
      .map(([key, group]) =>
        showQuantity && group.length > 1 ? `${key} (x${group.length})` : key
      )
      .sort();

    return `${member} ${formattedWithQuantity.join(" ")}`;
  });
}

function mapCollectionByMember(
  collectionMap: Map<string, CollectionFormat>,
  entries: string[],
  members: string[]
): Map<string, CollectionFormat[]> {
  const output = new Map<string, CollectionFormat[]>();
  const collectionEntries = entries
    .map((slug) => collectionMap.get(slug))
    .filter((a) => a !== undefined);
  for (const member of members) {
    for (const collectionEntry of collectionEntries.filter(
      (a) => a.member === member
    )) {
      output.set(member, [...(output.get(member) ?? []), collectionEntry]);
    }
  }

  return output;
}
