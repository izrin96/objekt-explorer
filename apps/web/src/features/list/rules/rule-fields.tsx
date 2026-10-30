import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
