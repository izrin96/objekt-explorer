import { useController, type Control, type FieldValues, type Path } from "react-hook-form";

import { Description, FieldError, Label } from "@/components/intentui/field";
import { Input } from "@/components/intentui/input";
import { TextField } from "@/components/intentui/text-field";
import { m } from "@/paraglide/messages";

type ListSelectorProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
};

export function ListSelector<T extends FieldValues>({ control, name }: ListSelectorProps<T>) {
  const {
    field: { value, onChange, onBlur },
    fieldState: { invalid, error },
  } = useController({
    name,
    control,
    rules: {
      required: m.compare_list_selector_required(),
    },
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
      aria-label={m.compare_list_selector_label()}
    >
      <Label>{m.compare_list_selector_label()}</Label>
      <Description>{m.compare_list_selector_description()}</Description>
      <Input placeholder={m.compare_list_selector_placeholder()} />
      <FieldError>{error?.message}</FieldError>
    </TextField>
  );
}
