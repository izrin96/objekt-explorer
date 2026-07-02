import { Form } from "react-aria-components/Form";
import { Controller, useForm } from "react-hook-form";

import { ListSelector } from "@/components/compare/modal/list-selector";
import { ProfileSelector } from "@/components/compare/modal/profile-selector";
import { Button } from "@/components/intentui/button";
import { Description, Label } from "@/components/intentui/field";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import { Radio, RadioField, RadioGroup } from "@/components/intentui/radio";
import Portal from "@/components/shared/portal";
import { useCompareFilters } from "@/hooks/use-compare-filters";
import { m } from "@/paraglide/messages";

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
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{m.compare_modal_title()}</ModalTitle>
        <ModalDescription>
          {m.compare_modal_comparing_from({ name: sourceList.name })} (ID: {sourceList.id})
        </ModalDescription>
      </ModalHeader>
      <ModalBody>
        <CompareForm sourceList={sourceList} setOpen={setOpen} />
      </ModalBody>
      <ModalFooter id="submit-form-compare">
        <ModalClose>{m.common_modal_cancel()}</ModalClose>
      </ModalFooter>
    </ModalContent>
  );
}

function CompareForm({ setOpen }: { sourceList: SourceList; setOpen: (val: boolean) => void }) {
  const [, setCompare] = useCompareFilters();
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
    void setCompare({
      cmp_type: data.targetType,
      cmp_to: data.targetType === "profile" ? data.targetProfile : data.targetList,
      cmp_mode: data.mode,
    });
    setOpen(false);
  });

  return (
    <Form onSubmit={onSubmit} validationBehavior="aria">
      <div className="flex flex-col gap-6">
        <Controller
          control={control}
          name="targetType"
          render={({ field: { name, value, onChange } }) => (
            <RadioGroup name={name} value={value} onChange={onChange} validationBehavior="aria">
              <Label>{m.compare_modal_target_type_label()}</Label>
              <Description>{m.compare_modal_target_type_description()}</Description>
              <RadioField value="profile">
                <Radio>{m.compare_modal_target_type_profile_label()}</Radio>
                <Description>{m.compare_modal_target_type_profile_description()}</Description>
              </RadioField>
              <RadioField value="list">
                <Radio>{m.compare_modal_target_type_list_label()}</Radio>
                <Description>{m.compare_modal_target_type_list_description()}</Description>
              </RadioField>
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
              <Label>{m.compare_modal_comparison_type_label()}</Label>
              <Description>{m.compare_modal_comparison_type_description()}</Description>
              <RadioField value="missing">
                <Radio>{m.compare_modal_comparison_type_missing_label()}</Radio>
                <Description>{m.compare_modal_comparison_type_missing_description()}</Description>
              </RadioField>
              <RadioField value="matches">
                <Radio>{m.compare_modal_comparison_type_matches_label()}</Radio>
                <Description>{m.compare_modal_comparison_type_matches_description()}</Description>
              </RadioField>
            </RadioGroup>
          )}
        />

        <Portal to="#submit-form-compare">
          <Button type="submit" onPress={() => onSubmit()}>
            {m.compare_modal_submit()}
          </Button>
        </Portal>
      </div>
    </Form>
  );
}
