"use client";

import { QueryErrorResetBoundary, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
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
import { getBaseURL, getListHref, parseNickname } from "@/lib/utils";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function GenerateDiscordFormatModal({ open, setOpen }: Props) {
  const t = useTranslations("generate_discord");
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{t("title")}</ModalTitle>
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
  const t = useTranslations("generate_discord");

  const { handleSubmit, control, reset } = useForm({
    defaultValues: {
      haveList: "",
      wantList: "",
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
        toast.error(t("error"));
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
      toast.error(t("select_at_least_one"));
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
              lowercase: formData.lowercase,
              bullet: formData.bullet,
              groupByMode: formData.groupBy,
              style: formData.style,
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
              lowercase: formData.lowercase,
              bullet: formData.bullet,
              groupByMode: formData.groupBy,
              style: formData.style,
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
    <Form className="flex flex-col gap-2" onSubmit={onSubmit}>
      <Controller
        control={control}
        name="haveList"
        render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid, error } }) => (
          <Select
            placeholder={t("list_placeholder")}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            isInvalid={invalid}
          >
            <Label>{t("have_list_label")}</Label>
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
            placeholder={t("list_placeholder")}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            isInvalid={invalid}
          >
            <Label>{t("want_list_label")}</Label>
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
          <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
            <Label>{t("show_count")}</Label>
          </Checkbox>
        )}
      />
      <Controller
        control={control}
        name="includeLink"
        render={({ field: { name, value, onChange, onBlur } }) => (
          <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
            <Label>{t("include_link")}</Label>
          </Checkbox>
        )}
      />
      <Controller
        control={control}
        name="lowercase"
        render={({ field: { name, value, onChange, onBlur } }) => (
          <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
            <Label>{t("lower_case")}</Label>
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
            <Label>{t("bulleted_list")}</Label>
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
            placeholder={t("group_by_placeholder")}
          >
            <Label>{t("group_by_label")}</Label>
            <SelectTrigger />
            <SelectContent>
              <SelectItem id="none" textValue="none">
                {t("group_by_none")}
              </SelectItem>
              <SelectItem id="season" textValue="season">
                {t("group_by_season")}
              </SelectItem>
              <SelectItem id="season-first" textValue="season-first">
                {t("group_by_season_first")}
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
            placeholder={t("style_placeholder")}
          >
            <Label>{t("style_label")}</Label>
            <SelectTrigger />
            <SelectContent>
              <SelectItem id="default" textValue="default">
                {t("style_default")}
              </SelectItem>
              <SelectItem id="compact" textValue="compact">
                {t("style_compact")}
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      />
      <TextField>
        <Label>{t("formatted_text_label")}</Label>
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
          <Button intent="outline" onPress={handleReset}>
            {t("reset_button")}
          </Button>
          <Button isPending={generateDiscordFormat.isPending} onPress={() => onSubmit()}>
            {t("generate_button")}
          </Button>
        </div>
      </Portal>
    </Form>
  );
}
