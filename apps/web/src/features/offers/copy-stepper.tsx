import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import { m } from "@/paraglide/messages";

export function CopyStepper({
  count,
  max,
  full,
  name,
  inputLabel,
  caption,
  onCount,
}: {
  count: number;
  max: number;
  full: boolean;
  name: string;
  /** the field's accessible name, `name` when absent */
  inputLabel?: string;
  /** the line under the stepper; `null` leaves it to the caller */
  caption?: string | null;
  onCount: (count: number) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {/* a count already above what is spare stays, so it can come down; Base UI keeps a
          stepper at its bound focusable */}
      <NumberField
        size="sm"
        value={count}
        min={0}
        max={full ? count : Math.max(count, max)}
        onValueChange={(next) => {
          if (next !== null) onCount(next);
        }}
      >
        <NumberFieldGroup>
          <NumberFieldDecrement aria-label={m.offer_any_copy_fewer({ name })} />
          <NumberFieldInput aria-label={inputLabel ?? name} />
          <NumberFieldIncrement aria-label={m.offer_any_copy_more({ name })} />
        </NumberFieldGroup>
      </NumberField>
      {caption === null ? null : (
        <span className="text-muted-foreground text-xs leading-tight">
          {caption ?? m.offer_any_copy_their_choice()}
        </span>
      )}
    </div>
  );
}
