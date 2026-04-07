"use client";

import { useIntlayer } from "next-intlayer";
import { useController, type Control, type FieldValues, type Path } from "react-hook-form";

import { Description, FieldError, Label } from "@/components/intentui/field";
import { Input } from "@/components/intentui/input";
import { TextField } from "@/components/intentui/text-field";

type ProfileSelectorProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
};

export function ProfileSelector<T extends FieldValues>({ control, name }: ProfileSelectorProps<T>) {
  const content = useIntlayer("compare");
  const {
    field: { value, onChange, onBlur },
    fieldState: { invalid, error },
  } = useController({
    name,
    control,
    rules: {
      required: content.profile_selector.required.value,
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <TextField
        isRequired
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        isInvalid={invalid}
        validationBehavior="aria"
      >
        <Label>{content.profile_selector.label.value}</Label>
        <Description>{content.profile_selector.description.value}</Description>
        <Input placeholder={content.profile_selector.placeholder.value} />
        <FieldError>{error?.message}</FieldError>
      </TextField>
    </div>
  );
}
