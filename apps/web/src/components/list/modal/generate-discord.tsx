"use client";

import { QueryErrorResetBoundary, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { Form } from "react-aria-components";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { CopyButton } from "@/components/copy-button";
import ErrorFallbackRender from "@/components/error-boundary";
import Portal from "@/components/portal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError, Label } from "@/components/ui/field";
import { Loader } from "@/components/ui/loader";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import {
  type FormatStyle,
  format,
  type GroupByMode,
  makeMemberOrderedList,
  mapByMember,
} from "@/lib/discord-format-utils";
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

  const { handleSubmit, control, reset } = useForm({
    defaultValues: {
      haveSlug: "",
      wantSlug: "",
      includeLink: false,
      showCount: false,
      lowercase: false,
      bullet: false,
      groupBy: "none" as GroupByMode,
      style: "default" as FormatStyle,
    },
  });

  const generateDiscordFormat = useMutation(
    orpc.list.generateDiscordFormat.mutationOptions({
      onError: () => {
        toast.error("Error generating Discord format");
      },
    }),
  );

  const handleReset = () => {
    reset();
    setFormatText("");
  };

  const onSubmit = handleSubmit((formData) => {
    if (!formData.haveSlug && !formData.wantSlug) {
      toast.error("Please select at least one list");
      return;
    }

    generateDiscordFormat.mutate(
      {
        haveSlug: formData.haveSlug,
        wantSlug: formData.wantSlug,
      },
      {
        onSuccess: async (data) => {
          const { have, want } = data;
          const output: string[] = [];

          // Format have list if selected
          if (formData.haveSlug && have.length > 0) {
            const haveMembers = makeMemberOrderedList(have, artists);
            const haveCollections = mapByMember(have, haveMembers);
            const haveFormatted = format(haveCollections, {
              showQuantity: formData.showCount,
              lowercase: formData.lowercase,
              bullet: formData.bullet,
              groupByMode: formData.groupBy,
              style: formData.style,
            });

            output.push("## Have", "", haveFormatted);

            if (formData.includeLink) {
              output.push("", `[View this list](<${getBaseURL()}/list/${formData.haveSlug}>)`);
            }
          }

          // Format want list if selected
          if (formData.wantSlug && want.length > 0) {
            if (output.length > 0) {
              output.push(""); // Add spacing between sections
            }

            const wantMembers = makeMemberOrderedList(want, artists);
            const wantCollections = mapByMember(want, wantMembers);
            const wantFormatted = format(wantCollections, {
              showQuantity: formData.showCount,
              lowercase: formData.lowercase,
              bullet: formData.bullet,
              groupByMode: formData.groupBy,
              style: formData.style,
            });

            output.push("## Want", "", wantFormatted);

            if (formData.includeLink) {
              output.push("", `[View this list](<${getBaseURL()}/list/${formData.wantSlug}>)`);
            }
          }

          setFormatText(output.join("\n"));
        },
      },
    );
  });

  return (
    <Form className="flex flex-col gap-2" onSubmit={onSubmit}>
      <Controller
        control={control}
        name="haveSlug"
        render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid, error } }) => (
          <Select
            placeholder="Select a list (optional)"
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
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
        render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid, error } }) => (
          <Select
            placeholder="Select a list (optional)"
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
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
      <Controller
        control={control}
        name="bullet"
        render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
          <Checkbox
            name={name}
            isSelected={value}
            onChange={onChange}
            onBlur={onBlur}
            isInvalid={invalid}
          >
            <Label>Bulleted list</Label>
          </Checkbox>
        )}
      />
      <Controller
        control={control}
        name="groupBy"
        render={({ field: { name, value, onChange, onBlur } }) => (
          <Select
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Select grouping mode"
          >
            <Label>Group by</Label>
            <SelectTrigger />
            <SelectContent>
              <SelectItem id="none" textValue="none">
                None (member → collection)
              </SelectItem>
              <SelectItem id="season" textValue="season">
                Season (member → season → collection)
              </SelectItem>
              <SelectItem id="season-first" textValue="season-first">
                Season first (season → member → collection)
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      />
      <Controller
        control={control}
        name="style"
        render={({ field: { name, value, onChange, onBlur } }) => (
          <Select
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Select style"
          >
            <Label>Style</Label>
            <SelectTrigger />
            <SelectContent>
              <SelectItem id="default" textValue="default">
                Default
              </SelectItem>
              <SelectItem id="compact" textValue="compact">
                Compact
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      />
      <TextField>
        <Label>Formatted discord text</Label>
        <Textarea
          value={formatText}
          onChange={(e) => setFormatText(e.target.value)}
          className="max-h-64 min-h-32"
        />
      </TextField>
      <div className="flex">
        <CopyButton text={formatText} />
      </div>

      <Portal to="#submit-form">
        <div className="flex gap-2">
          <Button intent="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button isPending={generateDiscordFormat.isPending} onClick={onSubmit}>
            Generate
          </Button>
        </div>
      </Portal>
    </Form>
  );
}
