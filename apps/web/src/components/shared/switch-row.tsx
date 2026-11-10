import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** A labelled switch with a line of description under the label, read out as its description. */
export function SwitchRow({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p id={`${id}-desc`} className="text-muted-foreground text-xs text-pretty">
          {description}
        </p>
      </div>
      <Switch
        id={id}
        aria-describedby={`${id}-desc`}
        className="mt-0.5 shrink-0"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
