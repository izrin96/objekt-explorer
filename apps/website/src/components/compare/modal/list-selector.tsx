import { useController, type Control, type FieldValues, type Path } from "react-hook-form";
import { useIntlayer } from "react-intlayer";

import { Description, FieldError, Label } from "@/components/intentui/field";
import { Input } from "@/components/intentui/input";
import { TextField } from "@/components/intentui/text-field";

type ListSelectorProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
};

export function ListSelector<T extends FieldValues>({ control, name }: ListSelectorProps<T>) {
  const content = useIntlayer("compare");
  const {
    field: { value, onChange, onBlur },
    fieldState: { invalid, error },
  } = useController({
    name,
    control,
    rules: {
      required: content.list_selector.required.value,
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
      aria-label={content.list_selector.label.value}
    >
      <Label>{content.list_selector.label.value}</Label>
      <Description>{content.list_selector.description.value}</Description>
      <Input placeholder={content.list_selector.placeholder.value} />
      <FieldError>{error?.message}</FieldError>
    </TextField>
  );
}
