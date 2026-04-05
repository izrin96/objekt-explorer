"use client";

import {
  useController,
  type Control,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";

import { Description, FieldError, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TextField } from "@/components/ui/text-field";

type ProfileSelectorProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  rules?: RegisterOptions<T, Path<T>>;
  disabled?: boolean;
};

export function ProfileSelector<T extends FieldValues>({
  control,
  name,
  rules,
}: ProfileSelectorProps<T>) {
  const {
    field: { value, onChange, onBlur },
    fieldState: { invalid, error },
  } = useController({
    name,
    control,
    rules,
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
        <Label>Profile</Label>
        <Description>Enter a Cosmo ID to compare with</Description>
        <Input placeholder="Enter Cosmo ID" />
        <FieldError>{error?.message}</FieldError>
      </TextField>
    </div>
  );
}
