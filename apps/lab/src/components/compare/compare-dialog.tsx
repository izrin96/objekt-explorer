import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useState } from "react";
import * as z from "zod";

import { type FieldErrors, zodErrors } from "@/components/auth/form-util";
import { useCompareFilters } from "@/components/compare/compare-filters";
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
import type { LabList } from "@/store/lists";

type TargetType = "profile" | "list";
type Mode = "missing" | "matches";

type Choice<T> = { value: T; label: string; description: string };

/** `compare_modal_target_type_*` in `apps/website/messages/en.json` */
const TARGET_TYPES: Choice<TargetType>[] = [
  { value: "profile", label: "Profile", description: "Compare with a Cosmo profile" },
  { value: "list", label: "List", description: "Compare with another list" },
];

/** `compare_modal_comparison_type_*` */
const MODES: Choice<Mode>[] = [
  {
    value: "missing",
    label: "Show Unowned",
    description: "Show Objekts in source but not in target",
  },
  { value: "matches", label: "Show Matches", description: "Show Objekts found in both lists" },
];

/** `compare_{profile,list}_selector_*`; one field, two sets of copy */
const TARGET_FIELD: Record<
  TargetType,
  Choice<TargetType> & { placeholder: string; required: string }
> = {
  profile: {
    value: "profile",
    label: "Profile",
    description: "Enter a Cosmo ID to compare with",
    placeholder: "Enter Cosmo ID",
    required: "Cosmo ID is required.",
  },
  list: {
    value: "list",
    label: "List",
    description: "Paste a list ID to compare with",
    placeholder: "Enter list ID",
    required: "List ID is required.",
  },
};

/**
 * Port of `compare/compare-button.tsx` + `compare/modal/compare-modal.tsx`.
 * Submitting writes the three `cmp_*` params; the list view reads them back.
 *
 * Controlled, like every other dialog in the lab that a menu or a toolbar can
 * open, and reset on close so a cancelled comparison does not pre-fill the next.
 */
export function CompareButton({ list }: { list: LabList }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MagnifyingGlassIcon />
        Compare
      </Button>
      <CompareDialog list={list} open={open} onOpenChange={setOpen} />
    </>
  );
}

function CompareDialog({
  list,
  open,
  onOpenChange,
}: {
  list: LabList;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, setCompare] = useCompareFilters();
  const [targetType, setTargetType] = useState<TargetType>("profile");
  const [mode, setMode] = useState<Mode>("missing");
  const [errors, setErrors] = useState<FieldErrors>({});

  const field = TARGET_FIELD[targetType];
  const schema = z.object({ target: z.string().trim().min(1, field.required) });

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
            <DialogTitle className="font-display">Compare Lists</DialogTitle>
            <DialogDescription>
              Comparing from: {list.name} (ID: {list.id})
            </DialogDescription>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-5">
            <ChoiceGroup
              label="Compare with"
              description="Select a profile or list to compare against the source"
              choices={TARGET_TYPES}
              value={targetType}
              onValueChange={setTargetType}
            />

            {/* keyed on the type: a Cosmo ID is not a list ID, so switching
                clears both the text and the error rather than carrying them */}
            <Field key={targetType} name="target" className="w-full gap-1.5">
              <FieldLabel>{field.label}</FieldLabel>
              <FieldDescription>{field.description}</FieldDescription>
              <Input autoFocus placeholder={field.placeholder} aria-required />
              <FieldError />
            </Field>

            <ChoiceGroup
              label="Comparison Type"
              description="Choose what to display in the results"
              choices={MODES}
              value={mode}
              onValueChange={setMode}
            />
          </DialogPanel>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="submit">Compare</Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}

/**
 * A labelled radio group whose rows carry a description, matching the app's
 * `RadioField`. Each row is its own `Field` so Base UI wires the label to the
 * radio; the group's own heading is a plain `<span>`, since a second
 * `Field.Label` in the same root would fight the row's for the control id.
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
              <span className="font-medium">{choice.label}</span>
              <FieldDescription render={<span />}>{choice.description}</FieldDescription>
            </FieldLabel>
          </Field>
        ))}
      </RadioGroup>
    </div>
  );
}
