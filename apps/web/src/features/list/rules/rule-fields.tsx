import { Label } from "@/components/ui/label";
import { RadioGroup, RadioPrimitive } from "@/components/ui/radio-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { RuleDraft } from "./rule-draft";

export function RuleSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        onValueChange={(next: string | null) => {
          if (next !== null) onChange(next);
        }}
      >
        <SelectTrigger id={id} className="min-w-0">
          <SelectValue>
            {(next: string) => options.find((option) => option.value === next)?.label ?? next}
          </SelectValue>
        </SelectTrigger>
        <SelectPopup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </div>
  );
}

export function ChipGroup({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      {description ? (
        <p className="text-muted-foreground -mt-1 text-xs text-pretty">{description}</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

const RULE_KINDS = [
  {
    value: "collection",
    label: m.rule_kind_collection,
    desc: m.rule_kind_collection_desc,
    example: m.rule_kind_collection_example,
  },
  {
    value: "set",
    label: m.rule_kind_set,
    desc: m.rule_kind_set_desc,
    example: m.rule_kind_set_example,
  },
] as const;

// each kind says what it takes and shows one, since the two read alike by name
export function RuleKindRadio({
  id,
  value,
  onChange,
}: {
  id: string;
  value: RuleDraft["kind"];
  onChange: (kind: RuleDraft["kind"]) => void;
}) {
  return (
    <RadioGroup
      aria-label={m.rule_kind_label()}
      value={value}
      onValueChange={(next) => {
        const kind = RULE_KINDS.find((item) => item.value === next)?.value;
        if (kind) onChange(kind);
      }}
      className="gap-2"
    >
      {RULE_KINDS.map((item) => (
        <RadioPrimitive.Root
          key={item.value}
          value={item.value}
          aria-describedby={`${id}-kind-${item.value}`}
          className={cn(
            "focus-visible:ring-ring focus-visible:ring-offset-background hover:bg-muted flex w-full cursor-pointer flex-col items-start gap-1 rounded-lg border p-3 text-start outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
            "data-checked:border-accent-solid data-checked:bg-accent",
          )}
        >
          <span className="text-sm font-medium">{item.label()}</span>
          <span
            id={`${id}-kind-${item.value}`}
            className="text-muted-foreground flex flex-col gap-0.5 text-xs text-pretty"
          >
            <span>{item.desc()}</span>
            <span>{item.example()}</span>
          </span>
        </RadioPrimitive.Root>
      ))}
    </RadioGroup>
  );
}
