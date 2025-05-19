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
import { CollectionFormat } from "@/lib/server/api/routers/list";
import { api } from "@/lib/trpc/client";
import { getBaseURL } from "@/lib/utils";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";

export function GenerateDiscordFormat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button intent="outline" onClick={() => setOpen(true)}>
        Generate Discord Format
      </Button>
      <Modal.Content isOpen={open} onOpenChange={setOpen}>
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              FallbackComponent={ErrorFallbackRender}
            >
              <Suspense
                fallback={
                  <div className="flex justify-center">
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
    </>
  );
}

function Content() {
  const [data] = api.list.myList.useSuspenseQuery();
  const [formatText, setFormatText] = useState("");
  const [showCount, setShowCount] = useState(false);
  const [includeLink, setIncludeLink] = useState(false);

  const generateDiscordFormat = api.list.generateDiscordFormat.useMutation({
    onError: () => {
      toast.error("Error generating Discord format");
    },
  });

  useEffect(() => {
    if (!generateDiscordFormat.data) return;

    const { have, want, haveSlug, wantSlug } = generateDiscordFormat.data;
    const haveMap = new Map(have);
    const wantMap = new Map(want);

    setFormatText(
      [
        "### Have:",
        ...format(haveMap, showCount),
        ...(includeLink
          ? [
              "",
              `[View this list with picture](<${getBaseURL()}/list/${haveSlug}>)`,
              "", // give a little bit of spacing
            ]
          : []),
        "### Want:",
        ...format(wantMap, showCount),
        ...(includeLink
          ? [
              "",
              `[View this list with picture](<${getBaseURL()}/list/${wantSlug}>)`,
            ]
          : []),
      ].join("\n")
    );
  }, [generateDiscordFormat.data, includeLink, showCount]);

  return (
    <Form
      onSubmit={async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        generateDiscordFormat.mutate({
          haveSlug: formData.get("haveSlug") as string,
          wantSlug: formData.get("wantSlug") as string,
        });
      }}
    >
      <Modal.Header>
        <Modal.Title>Generate Discord Format</Modal.Title>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-2">
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
        <Checkbox
          label="Show count"
          isSelected={showCount}
          onChange={setShowCount}
        />
        <Checkbox
          label="Include link"
          isSelected={includeLink}
          onChange={setIncludeLink}
        />
        <Textarea
          label="Formatted discord text"
          value={formatText}
          onChange={setFormatText}
        />
        <div>
          <CopyButton text={formatText} />
        </div>
      </Modal.Body>
      <Modal.Footer className="flex justify-end">
        <Button type="submit" isPending={generateDiscordFormat.isPending}>
          Generate
        </Button>
      </Modal.Footer>
    </Form>
  );
}

function format(
  collectionMap: Map<string, CollectionFormat[]>,
  showQuantity: boolean
) {
  return Array.from(collectionMap.entries()).map(([member, collections]) => {
    const formatCollections = collections.map((collection) => {
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

    return `${member} ${formattedWithQuantity.join(", ")}`;
  });
}
