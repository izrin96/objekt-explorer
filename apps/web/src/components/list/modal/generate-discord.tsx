"use client";

import { QueryErrorResetBoundary, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { Suspense, useState } from "react";
import { Form } from "react-aria-components/Form";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { CopyButton } from "@/components/copy-button";
import ErrorFallbackRender from "@/components/error-boundary";
import { Button } from "@/components/intentui/button";
import { Checkbox } from "@/components/intentui/checkbox";
import { FieldError, Label } from "@/components/intentui/field";
import { Loader } from "@/components/intentui/loader";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/intentui/select";
import { TextField } from "@/components/intentui/text-field";
import { Textarea } from "@/components/intentui/textarea";
import Portal from "@/components/portal";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilterData } from "@/hooks/use-filter-data";
import {
  type FormatStyle,
  format,
  type GroupByMode,
  makeMemberOrderedList,
  mapByMember,
} from "@/lib/discord-format-utils";
import { orpc } from "@/lib/orpc/client";
import { getBaseURL, getListHref, parseNickname } from "@/lib/utils";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function GenerateDiscordFormatModal({ open, setOpen }: Props) {
  const content = useIntlayer("generate_discord");
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{content.title.value}</ModalTitle>
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
      <ModalFooter className="flex justify-end" id="submit-form-discord"></ModalFooter>
    </ModalContent>
  );
}

function Content() {
  const { data } = useSuspenseQuery(orpc.list.list.queryOptions());
  const [formatText, setFormatText] = useState("");
  const { artists, compareMember } = useCosmoArtist();
  const { compareSeason } = useFilterData();
  const content = useIntlayer("generate_discord");

  const { handleSubmit, control, reset, setValue, watch } = useForm({
    defaultValues: {
      haveList: "",
      wantList: "",
      includeLink: false,
      showCount: false,
      lowercaseCollection: false,
      bullet: false,
      showMemberEmoji: false,
      groupBy: "none" as GroupByMode,
      style: "default" as FormatStyle,
    },
  });

  const groupByValue = watch("groupBy");

  const generateDiscordFormat = useMutation(
    orpc.list.generateDiscordFormat.mutationOptions({
      onError: () => {
        toast.error(content.error.value);
      },
    }),
  );

  const handleReset = () => {
    reset();
    setFormatText("");
  };

  const onSubmit = handleSubmit((formData) => {
    const haveListSlug = formData.haveList || undefined;
    const wantListSlug = formData.wantList || undefined;

    if (!haveListSlug && !wantListSlug) {
      toast.error(content.select_at_least_one.value);
      return;
    }

    // Get selected list info for building links
    const haveList = data.find((l) => l.slug === haveListSlug);
    const wantList = data.find((l) => l.slug === wantListSlug);

    generateDiscordFormat.mutate(
      {
        haveListSlug,
        wantListSlug,
      },
      {
        onSuccess: async (data) => {
          const { have: haveCollections, want: wantCollections } = data;
          const output: string[] = [];

          // Format have list if selected
          if (haveListSlug && haveCollections.length > 0) {
            const haveMembers = makeMemberOrderedList(haveCollections, artists);
            const haveCollectionsMap = mapByMember(haveCollections, haveMembers);
            const haveFormatted = format(haveCollectionsMap, {
              showQuantity: formData.showCount,
              lowercaseCollection: formData.lowercaseCollection,
              bullet: formData.bullet,
              showMemberEmoji: formData.showMemberEmoji,
              groupByMode: formData.groupBy,
              style: formData.style,
              compareSeason,
              compareMember,
            });

            output.push("## Have", "", haveFormatted);

            if (formData.includeLink && haveList) {
              output.push("", `[View this list](<${getBaseURL()}${getListHref(haveList)}>)`);
            }
          }

          // Format want list if selected
          if (wantListSlug && wantCollections.length > 0) {
            if (output.length > 0) {
              output.push(""); // Add spacing between sections
            }

            const wantMembers = makeMemberOrderedList(wantCollections, artists);
            const wantCollectionsMap = mapByMember(wantCollections, wantMembers);
            const wantFormatted = format(wantCollectionsMap, {
              showQuantity: formData.showCount,
              lowercaseCollection: formData.lowercaseCollection,
              bullet: formData.bullet,
              showMemberEmoji: formData.showMemberEmoji,
              groupByMode: formData.groupBy,
              style: formData.style,
              compareSeason,
              compareMember,
            });

            output.push("## Want", "", wantFormatted);

            if (formData.includeLink && wantList) {
              output.push("", `[View this list](<${getBaseURL()}${getListHref(wantList)}>)`);
            }
          }

          setFormatText(output.join("\n"));
        },
      },
    );
  });

  return (
    <Form className="flex flex-col gap-2" onSubmit={onSubmit} validationBehavior="aria">
      <Controller
        control={control}
        name="haveList"
        render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid, error } }) => (
          <Select
            placeholder={content.list_placeholder.value}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            isInvalid={invalid}
            validationBehavior="aria"
          >
            <Label>{content.have_list_label.value}</Label>
            <SelectTrigger />
            <SelectContent>
              {data.map((item) => (
                <SelectItem key={item.slug} id={item.slug} textValue={item.slug}>
                  <SelectLabel>
                    {item.name}{" "}
                    {item.profileAddress && (
                      <span className="text-muted-fg text-xs">
                        ({parseNickname(item.profileAddress, item.nickname)})
                      </span>
                    )}
                  </SelectLabel>
                </SelectItem>
              ))}
            </SelectContent>
            <FieldError>{error?.message}</FieldError>
          </Select>
        )}
      />
      <Controller
        control={control}
        name="wantList"
        render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid, error } }) => (
          <Select
            placeholder={content.list_placeholder.value}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            isInvalid={invalid}
            validationBehavior="aria"
          >
            <Label>{content.want_list_label.value}</Label>
            <SelectTrigger />
            <SelectContent>
              {data.map((item) => (
                <SelectItem key={item.slug} id={item.slug} textValue={item.slug}>
                  <SelectLabel>
                    {item.name}{" "}
                    {item.profileAddress && (
                      <span className="text-muted-fg text-xs">
                        ({parseNickname(item.profileAddress, item.nickname)})
                      </span>
                    )}
                  </SelectLabel>
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
          <Checkbox
            name={name}
            isSelected={value}
            onChange={onChange}
            onBlur={onBlur}
            validationBehavior="aria"
          >
            <Label>{content.show_count.value}</Label>
          </Checkbox>
        )}
      />
      <Controller
        control={control}
        name="includeLink"
        render={({ field: { name, value, onChange, onBlur } }) => (
          <Checkbox
            name={name}
            isSelected={value}
            onChange={onChange}
            onBlur={onBlur}
            validationBehavior="aria"
          >
            <Label>{content.include_link.value}</Label>
          </Checkbox>
        )}
      />
      <Controller
        control={control}
        name="lowercaseCollection"
        render={({ field: { name, value, onChange, onBlur } }) => (
          <Checkbox
            name={name}
            isSelected={value}
            onChange={onChange}
            onBlur={onBlur}
            validationBehavior="aria"
          >
            <Label>{content.lower_case.value}</Label>
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
            validationBehavior="aria"
          >
            <Label>{content.bulleted_list.value}</Label>
          </Checkbox>
        )}
      />
      <Controller
        control={control}
        name="showMemberEmoji"
        render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
          <Checkbox
            name={name}
            isSelected={value}
            onChange={onChange}
            onBlur={onBlur}
            isInvalid={invalid}
            validationBehavior="aria"
          >
            <Label>{content.show_member_emoji.value}</Label>
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
            onChange={(val) => {
              onChange(val);
              if (val === "none") {
                setValue("style", "default");
              }
            }}
            onBlur={onBlur}
            placeholder={content.group_by_placeholder.value}
            validationBehavior="aria"
          >
            <Label>{content.group_by_label.value}</Label>
            <SelectTrigger />
            <SelectContent>
              <SelectItem id="none" textValue="none">
                {content.group_by_none.value}
              </SelectItem>
              <SelectItem id="season" textValue="season">
                {content.group_by_season.value}
              </SelectItem>
              <SelectItem id="season-first" textValue="season-first">
                {content.group_by_season_first.value}
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
            placeholder={content.style_placeholder.value}
            validationBehavior="aria"
            isDisabled={groupByValue === "none"}
          >
            <Label>{content.style_label.value}</Label>
            <SelectTrigger />
            <SelectContent>
              <SelectItem id="default" textValue="default">
                {content.style_default.value}
              </SelectItem>
              <SelectItem id="compact" textValue="compact">
                {content.style_compact.value}
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      />
      <TextField>
        <Label>{content.formatted_text_label.value}</Label>
        <Textarea
          value={formatText}
          onChange={(e) => setFormatText(e.target.value)}
          className="max-h-64 min-h-32"
        />
      </TextField>
      <div className="flex">
        <CopyButton text={formatText} />
      </div>

      <Portal to="#submit-form-discord">
        <div className="flex gap-2">
          <Button intent="outline" onPress={handleReset}>
            {content.reset_button.value}
          </Button>
          <Button isPending={generateDiscordFormat.isPending} onPress={() => onSubmit()}>
            {content.generate_button.value}
          </Button>
        </div>
      </Portal>
    </Form>
  );
}
