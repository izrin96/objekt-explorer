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
  const content = useIntlayer("common");

  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>Compare List</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <CompareForm sourceList={sourceList} setOpen={setOpen} />
      </ModalBody>
      <ModalFooter id="submit-form-compare">
        <ModalClose>{content.modal.cancel.value}</ModalClose>
      </ModalFooter>
    </ModalContent>
  );
}

function CompareForm({ sourceList }: { sourceList: SourceList; setOpen: (val: boolean) => void }) {
  const content = useIntlayer("common");

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
      params.set("targetAddress", data.targetProfile);
    } else {
      params.set("targetListId", data.targetList);
    }

    window.open(`/compare-tool?${params.toString()}`, "_blank");
  });

  return (
    <Form onSubmit={onSubmit} validationBehavior="aria">
      <div className="flex flex-col gap-6">
        <span className="text-muted-fg text-sm">
          Comparing from: <span className="text-fg font-medium">{sourceList.name}</span>
        </span>
        <Controller
          control={control}
          name="targetType"
          render={({ field: { name, value, onChange } }) => (
            <RadioGroup name={name} value={value} onChange={onChange} validationBehavior="aria">
              <Label>Compare with</Label>
              <Description>Choose whether to compare with a profile or another list</Description>
              <Radio value="profile">
                <Label>Profile</Label>
                <Description>Compare with a Cosmo profile</Description>
              </Radio>
              <Radio value="list">
                <Label>List</Label>
                <Description>Compare with another list</Description>
              </Radio>
            </RadioGroup>
          )}
        />

        {watchedTargetType === "profile" && (
          <ProfileSelector
            control={control}
            name="targetProfile"
            rules={{
              required: "Profile is required.",
            }}
          />
        )}

        {watchedTargetType === "list" && (
          <ListSelector
            control={control}
            name="targetList"
            rules={{
              required: "List is required.",
            }}
          />
        )}

        <Controller
          control={control}
          name="mode"
          render={({ field: { name, value, onChange } }) => (
            <RadioGroup name={name} value={value} onChange={onChange} validationBehavior="aria">
              <Label>Comparison Type</Label>
              <Description>Choose what to show in the comparison results</Description>
              <Radio value="missing">
                <Label>Missing</Label>
                <Description>Show objekts in source but not in target</Description>
              </Radio>
              <Radio value="matches">
                <Label>Matches</Label>
                <Description>Show objekts that appear in both source and target</Description>
              </Radio>
            </RadioGroup>
          )}
        />

        <Portal to="#submit-form-compare">
          <Button type="submit" onPress={() => onSubmit()}>
            {content.actions.continue.value}
          </Button>
        </Portal>
      </div>
    </Form>
  );
}
