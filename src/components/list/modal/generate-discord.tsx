"use client";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import ErrorFallbackRender from "@/components/error-boundary";
import { Button, Checkbox, Form, Loader, Modal, Select, Textarea } from "@/components/ui";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { format, makeMemberOrderedList, mapCollectionByMember } from "@/lib/discord-format-utils";
import { api } from "@/lib/trpc/client";
import { getBaseURL } from "@/lib/utils";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function GenerateDiscordFormatModal({ open, setOpen }: Props) {
  return (
    <Modal.Content isOpen={open} onOpenChange={setOpen}>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
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
            const lowercase = formData.get("lowercase") === "on";

            generateDiscordFormat.mutate(
              {
                haveSlug,
                wantSlug,
              },
              {
                onSuccess: async (data) => {
                  const { have, want, collections } = data;

                  // collections map for faster search
                  const collectionsMap = new Map(collections.map((a) => [a.slug, a]));

                  const members = makeMemberOrderedList(collections, artists);

                  const haveCollections = mapCollectionByMember(collectionsMap, have, members);
                  const wantCollections = mapCollectionByMember(collectionsMap, want, members);

                  setFormatText(
                    [
                      "## Have",
                      ...format(haveCollections, showCount, lowercase),
                      ...(includeLink
                        ? [
                            "",
                            `[View this list](<${getBaseURL()}/list/${haveSlug}>)`,
                            "", // give a little bit of spacing
                          ]
                        : []),
                      "## Want",
                      ...format(wantCollections, showCount, lowercase),
                      ...(includeLink
                        ? ["", `[View this list](<${getBaseURL()}/list/${wantSlug}>)`]
                        : []),
                    ].join("\n"),
                  );
                },
              },
            );
          }}
        >
          <Select label="Have list" name="haveSlug" placeholder="Select a list" isRequired>
            <Select.Trigger />
            <Select.List items={data}>
              {(item) => (
                <Select.Option id={item.slug} textValue={item.slug}>
                  {item.name}
                </Select.Option>
              )}
            </Select.List>
          </Select>
          <Select label="Want list" name="wantSlug" placeholder="Select a list" isRequired>
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
          <Checkbox label="Lower case" name="lowercase" />
          <Textarea label="Formatted discord text" value={formatText} onChange={setFormatText} />
          <div className="flex">
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
