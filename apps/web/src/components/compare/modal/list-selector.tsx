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

type ListSelectorProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  rules?: RegisterOptions<T, Path<T>>;
  disabled?: boolean;
};

export function ListSelector<T extends FieldValues>({
  control,
  name,
  rules,
}: ListSelectorProps<T>) {
  const {
    field: { value, onChange, onBlur },
    fieldState: { invalid, error },
  } = useController({
    name,
    control,
    rules,
  });

  return (
    <TextField
      isRequired
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      isInvalid={invalid}
      validationBehavior="aria"
      aria-label="List ID"
    >
      <Label>List</Label>
      <Description>Paste a list ID to compare with</Description>
      <Input placeholder="Enter list ID" />
      <FieldError>{error?.message}</FieldError>
    </TextField>
  );
}
