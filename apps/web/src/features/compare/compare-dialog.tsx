import { useState } from "react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

import { useSetCompare } from "./use-compare";

type TargetType = "profile" | "list";
type Mode = "missing" | "matches";

type Choice<T extends string> = { value: T; label: () => string; description: () => string };

const TARGET_TYPES: Choice<TargetType>[] = [
  {
    value: "profile",
    label: m.compare_modal_target_type_profile_label,
    description: m.compare_modal_target_type_profile_description,
  },
  {
    value: "list",
    label: m.compare_modal_target_type_list_label,
    description: m.compare_modal_target_type_list_description,
  },
];

const MODES: Choice<Mode>[] = [
  {
    value: "missing",
    label: m.compare_modal_comparison_type_missing_label,
    description: m.compare_modal_comparison_type_missing_description,
  },
  {
    value: "matches",
    label: m.compare_modal_comparison_type_matches_label,
    description: m.compare_modal_comparison_type_matches_description,
  },
];

/** one field, two sets of copy */
const TARGET_FIELD: Record<
  TargetType,
  {
    label: () => string;
    description: () => string;
    placeholder: () => string;
    required: () => string;
  }
> = {
  profile: {
    label: m.compare_profile_selector_label,
    description: m.compare_profile_selector_description,
    placeholder: m.compare_profile_selector_placeholder,
    required: m.compare_profile_selector_required,
  },
  list: {
    label: m.compare_list_selector_label,
    description: m.compare_list_selector_description,
    placeholder: m.compare_list_selector_placeholder,
    required: m.compare_list_selector_required,
  },
};

export function CompareDialog({
  sourceName,
  sourceId,
  open,
  onOpenChange,
}: {
  sourceName: string;
  sourceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setCompare = useSetCompare();
  const [targetType, setTargetType] = useState<TargetType>("profile");
  const [mode, setMode] = useState<Mode>("missing");
  const [errors, setErrors] = useState<FieldErrors>({});

  const field = TARGET_FIELD[targetType];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setTargetType("profile");
          setMode("missing");
          setErrors({});
        }
        onOpenChange(next);
      }}
    >
      <DialogPopup className="max-w-md">
        <Form
          className="contents"
          errors={errors}
          onFormSubmit={(values) => {
            const schema = z.object({ target: z.string().trim().min(1, field.required()) });
            const next = zodErrors(schema, values);
            setErrors(next);
            if (Object.keys(next).length > 0) return;
            setCompare({
              cmp_type: targetType,
              cmp_to: String(values.target ?? "").trim(),
              cmp_mode: mode,
            });
            onOpenChange(false);
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display">{m.compare_modal_title()}</DialogTitle>
            <DialogDescription>
              {m.compare_modal_comparing_from({ name: sourceName })} (
              {m.compare_modal_source_id({ id: sourceId })})
            </DialogDescription>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-5">
            <ChoiceGroup
              label={m.compare_modal_target_type_label()}
              description={m.compare_modal_target_type_description()}
              choices={TARGET_TYPES}
              value={targetType}
              onValueChange={setTargetType}
            />

            {/* keyed on the type: a Cosmo ID is not a list ID, so switching
                clears the text and the error rather than carrying them over */}
            <Field key={targetType} name="target" className="w-full gap-1.5">
              <FieldLabel>{field.label()}</FieldLabel>
              <FieldDescription>{field.description()}</FieldDescription>
              <Input autoFocus aria-required placeholder={field.placeholder()} />
              <FieldError />
            </Field>

            <ChoiceGroup
              label={m.compare_modal_comparison_type_label()}
              description={m.compare_modal_comparison_type_description()}
              choices={MODES}
              value={mode}
              onValueChange={setMode}
            />
          </DialogPanel>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {m.common_modal_cancel()}
            </DialogClose>
            <Button type="submit">{m.compare_modal_submit()}</Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}

/**
 * Each row is its own `Field` so Base UI wires the label to the radio; the
 * group's heading is a plain span, since a second `FieldLabel` under the same
 * root would fight the row's for the control id.
 */
function ChoiceGroup<T extends string>({
  label,
  description,
  choices,
  value,
  onValueChange,
}: {
  label: string;
  description: string;
  choices: Choice<T>[];
  value: T;
  onValueChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label render={<span />}>{label}</Label>
      <span className="text-muted-foreground text-xs">{description}</span>
      <RadioGroup
        aria-label={label}
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string") onValueChange(next as T);
        }}
        className="mt-1 gap-2.5"
      >
        {choices.map((choice) => (
          <Field key={choice.value} className="w-full flex-row items-start gap-2.5">
            <Radio value={choice.value} className="mt-0.5" />
            <FieldLabel className="flex-col items-start gap-0.5 font-normal">
              <span className="font-medium">{choice.label()}</span>
              <FieldDescription render={<span />}>{choice.description()}</FieldDescription>
            </FieldLabel>
          </Field>
        ))}
      </RadioGroup>
    </div>
  );
}
