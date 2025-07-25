"use client";

import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { CopyButton } from "@/components/copy-button";
import ErrorFallbackRender from "@/components/error-boundary";
import { Button, Checkbox, Form, Loader, Modal, Textarea } from "@/components/ui";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { useTarget } from "@/hooks/use-target";
import { format, makeMemberOrderedList, mapByMember } from "@/lib/discord-format-utils";
import { filterObjekts } from "@/lib/filter-utils";
import { ownedCollectionOptions } from "@/lib/query-options";

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
  const [formatText, setFormatText] = useState("");
  const { artists, selectedArtistIds } = useCosmoArtist();
  const profile = useTarget((a) => a.profile)!;
  const [filters] = useFilters();

  const ownedQuery = useSuspenseQuery(ownedCollectionOptions(profile.address, selectedArtistIds));
  const filteredObjekts = useMemo(
    () => filterObjekts(filters, ownedQuery.data),
    [filters, ownedQuery.data],
  );

  return (
    <>
      <Modal.Header>
        <Modal.Title>Generate Discord Format</Modal.Title>
        <Modal.Description>List of objekt is based on current filter.</Modal.Description>
      </Modal.Header>
      <Modal.Body>
        <Form
          className="flex flex-col gap-2"
          ref={formRef}
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const showCount = formData.get("showCount") === "on";
            const lowercase = formData.get("lowercase") === "on";

            const members = makeMemberOrderedList(filteredObjekts, artists);

            const haveCollections = mapByMember(filteredObjekts, members);

            setFormatText(["## Have", ...format(haveCollections, showCount, lowercase)].join("\n"));
          }}
        >
          <Checkbox label="Show count" name="showCount" />
          <Checkbox label="Lower case" name="lowercase" />
          <Textarea label="Formatted discord text" value={formatText} onChange={setFormatText} />
          <div className="flex">
            <CopyButton text={formatText} />
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer className="flex justify-end">
        <Button type="submit" onClick={() => formRef.current.requestSubmit()}>
          Generate
        </Button>
      </Modal.Footer>
    </>
  );
}
