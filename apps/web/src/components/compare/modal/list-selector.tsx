"use client";

import {
  useController,
  type Control,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";

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
  disabled,
}: ListSelectorProps<T>) {
  const {
    field: { value, onChange, onBlur },
  } = useController({
    name,
    control,
    rules,
  });

  return (
    <TextField
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      isDisabled={disabled}
      validationBehavior="aria"
    >
      <Input placeholder="Enter list slug" aria-label="List slug" />
    </TextField>
  );
}
