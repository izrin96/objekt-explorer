import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** A labelled setting with a description and a switch on its right. */
export function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Label
      id={`${id}-label`}
      htmlFor={id}
      className="flex items-start justify-between gap-4 font-normal"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs text-pretty">{description}</span>
      </span>
      <Switch
        id={id}
        className="mt-0.5 shrink-0"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </Label>
  );
}
