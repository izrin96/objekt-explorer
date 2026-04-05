"use client";

import { useIntlayer } from "next-intlayer";
import { Form } from "react-aria-components";
import { Controller, useForm } from "react-hook-form";

import { ListSelector } from "@/components/compare/modal/list-selector";
import { ProfileSelector } from "@/components/compare/modal/profile-selector";
import Portal from "@/components/portal";
import { Button } from "@/components/ui/button";
import { Description, Label } from "@/components/ui/field";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Radio, RadioGroup } from "@/components/ui/radio";

type SourceList = {
  id: string;
  name: string;
};

type CompareModalProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
  sourceList: SourceList;
};

type CompareFormData = {
  targetType: "profile" | "list";
  targetProfile: string;
  targetList: string;
  mode: "missing" | "matches";
};

export function CompareModal({ open, setOpen, sourceList }: CompareModalProps) {
  const content = useIntlayer("compare");
  const commonContent = useIntlayer("common");

  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{content.modal.title.value}</ModalTitle>
        <ModalDescription>
          {content.modal.comparing_from({ name: sourceList.name }).value}
        </ModalDescription>
      </ModalHeader>
      <ModalBody>
        <CompareForm sourceList={sourceList} setOpen={setOpen} />
      </ModalBody>
      <ModalFooter id="submit-form-compare">
        <ModalClose>{commonContent.modal.cancel.value}</ModalClose>
      </ModalFooter>
    </ModalContent>
  );
}

function CompareForm({ sourceList }: { sourceList: SourceList; setOpen: (val: boolean) => void }) {
  const content = useIntlayer("compare");

  const { control, watch, handleSubmit } = useForm<CompareFormData>({
    defaultValues: {
      targetType: "profile",
      targetProfile: "",
      targetList: "",
      mode: "missing",
    },
  });

  const watchedTargetType = watch("targetType");

  const onSubmit = handleSubmit((data) => {
    const params = new URLSearchParams({
      sourceId: sourceList.id,
      targetType: data.targetType,
      mode: data.mode,
    });

    if (data.targetType === "profile") {
      params.set("targetProfile", data.targetProfile);
    } else {
      params.set("targetListId", data.targetList);
    }

    window.open(`/compare-tool?${params.toString()}`, "_blank");
  });

  return (
    <Form onSubmit={onSubmit} validationBehavior="aria">
      <div className="flex flex-col gap-6">
        <Controller
          control={control}
          name="targetType"
          render={({ field: { name, value, onChange } }) => (
            <RadioGroup name={name} value={value} onChange={onChange} validationBehavior="aria">
              <Label>{content.modal.target_type.label.value}</Label>
              <Description>{content.modal.target_type.description.value}</Description>
              <Radio value="profile">
                <Label>{content.modal.target_type.profile.label.value}</Label>
                <Description>{content.modal.target_type.profile.description.value}</Description>
              </Radio>
              <Radio value="list">
                <Label>{content.modal.target_type.list.label.value}</Label>
                <Description>{content.modal.target_type.list.description.value}</Description>
              </Radio>
            </RadioGroup>
          )}
        />

        {watchedTargetType === "profile" && (
          <ProfileSelector control={control} name="targetProfile" />
        )}

        {watchedTargetType === "list" && <ListSelector control={control} name="targetList" />}

        <Controller
          control={control}
          name="mode"
          render={({ field: { name, value, onChange } }) => (
            <RadioGroup name={name} value={value} onChange={onChange} validationBehavior="aria">
              <Label>{content.modal.comparison_type.label.value}</Label>
              <Description>{content.modal.comparison_type.description.value}</Description>
              <Radio value="missing">
                <Label>{content.modal.comparison_type.missing.label.value}</Label>
                <Description>{content.modal.comparison_type.missing.description.value}</Description>
              </Radio>
              <Radio value="matches">
                <Label>{content.modal.comparison_type.matches.label.value}</Label>
                <Description>{content.modal.comparison_type.matches.description.value}</Description>
              </Radio>
            </RadioGroup>
          )}
        />

        <Portal to="#submit-form-compare">
          <Button type="submit" onPress={() => onSubmit()}>
            {content.modal.submit.value}
          </Button>
        </Portal>
      </div>
    </Form>
  );
}
