"use client";

import { QueryErrorResetBoundary, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import ErrorFallbackRender from "@/components/error-boundary";
import Portal from "@/components/portal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError, Label } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Loader } from "@/components/ui/loader";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { format, makeMemberOrderedList, mapCollectionByMember } from "@/lib/discord-format-utils";
import { orpc } from "@/lib/orpc/client";
import { getBaseURL } from "@/lib/utils";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function GenerateDiscordFormatModal({ open, setOpen }: Props) {
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>Generate Discord Format</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <Suspense
                fallback={
                  <div className="flex justify-center pt-2 pb-8">
                    <Loader variant="ring" />
                  </div>
                }
              >
                <Content />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ModalBody>
      <ModalFooter className="flex justify-end" id="submit-form"></ModalFooter>
    </ModalContent>
  );
}

function Content() {
  const { data } = useSuspenseQuery(orpc.list.list.queryOptions());
  const [formatText, setFormatText] = useState("");
  const { artists } = useCosmoArtist();

  const { handleSubmit, control } = useForm({
    defaultValues: {
      haveSlug: "",
      wantSlug: "",
      includeLink: false,
      showCount: false,
      lowercase: false,
    },
  });

  const generateDiscordFormat = useMutation(
    orpc.list.generateDiscordFormat.mutationOptions({
      onError: () => {
        toast.error("Error generating Discord format");
      },
    }),
  );

  const onSubmit = handleSubmit((formData) => {
    generateDiscordFormat.mutate(
      {
        haveSlug: formData.haveSlug,
        wantSlug: formData.wantSlug,
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
              ...format(haveCollections, formData.showCount, formData.lowercase),
              ...(formData.includeLink
                ? [
                    "",
                    `[View this list](<${getBaseURL()}/list/${formData.haveSlug}>)`,
                    "", // give a little bit of spacing
                  ]
                : []),
              "## Want",
              ...format(wantCollections, formData.showCount, formData.lowercase),
              ...(formData.includeLink
                ? ["", `[View this list](<${getBaseURL()}/list/${formData.wantSlug}>)`]
                : []),
            ].join("\n"),
          );
        },
      },
    );
  });

  return (
    <Form className="flex flex-col gap-2" onSubmit={onSubmit}>
      <Controller
        control={control}
        name="haveSlug"
        rules={{
          required: "Have list is required.",
        }}
        render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid, error } }) => (
          <Select
            placeholder="Select a list"
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            isRequired
            isInvalid={invalid}
          >
            <Label>Have list</Label>
            <SelectTrigger />
            <SelectContent>
              {data.map((item) => (
                <SelectItem key={item.slug} id={item.slug} textValue={item.slug}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
            <FieldError>{error?.message}</FieldError>
          </Select>
        )}
      />
      <Controller
        control={control}
        name="wantSlug"
        rules={{
          required: "Want list is required.",
        }}
        render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid, error } }) => (
          <Select
            placeholder="Select a list"
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            isRequired
            isInvalid={invalid}
          >
            <Label>Want list</Label>
            <SelectTrigger />
            <SelectContent>
              {data.map((item) => (
                <SelectItem key={item.slug} id={item.slug} textValue={item.slug}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
            <FieldError>{error?.message}</FieldError>
          </Select>
        )}
      />
      <Controller
        control={control}
        name="showCount"
        render={({ field: { name, value, onChange, onBlur } }) => (
          <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
            <Label>Show count</Label>
          </Checkbox>
        )}
      />
      <Controller
        control={control}
        name="includeLink"
        render={({ field: { name, value, onChange, onBlur } }) => (
          <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
            <Label>Include link</Label>
          </Checkbox>
        )}
      />
      <Controller
        control={control}
        name="lowercase"
        render={({ field: { name, value, onChange, onBlur } }) => (
          <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
            <Label>Lower case</Label>
          </Checkbox>
        )}
      />
      <Textarea
        value={formatText}
        onChange={(e) => setFormatText(e.target.value)}
        className="max-h-64 min-h-32"
      >
        <Label>Formatted discord text</Label>
      </Textarea>
      <div className="flex">
        <CopyButton text={formatText} />
      </div>

      <Portal to="#submit-form">
        <Button isPending={generateDiscordFormat.isPending} onClick={onSubmit}>
          Generate
        </Button>
      </Portal>
    </Form>
  );
}
