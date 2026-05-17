import { useController, type Control, type FieldValues, type Path } from "react-hook-form";

import { Description, FieldError, Label } from "@/components/intentui/field";
import { Input } from "@/components/intentui/input";
import { TextField } from "@/components/intentui/text-field";
import { m } from "@/paraglide/messages";

type ProfileSelectorProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
};

export function ProfileSelector<T extends FieldValues>({ control, name }: ProfileSelectorProps<T>) {
  const {
    field: { value, onChange, onBlur },
    fieldState: { invalid, error },
  } = useController({
    name,
    control,
    rules: {
      required: m.compare_profile_selector_required(),
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
        <Label>{m.compare_profile_selector_label()}</Label>
        <Description>{m.compare_profile_selector_description()}</Description>
        <Input placeholder={m.compare_profile_selector_placeholder()} />
        <FieldError>{error?.message}</FieldError>
      </TextField>
    </div>
  );
}
