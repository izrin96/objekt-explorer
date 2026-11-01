import type { PlanList, PostKind, PostPlan } from "@repo/api/schemas/trade-post";
import { useId } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { joinList } from "@/lib/text";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { unpairedNames } from "./composer-choice";
import { unpairText } from "./post-kind-text";

type Prompt = { partner: string; onUnpair: () => void; onPickAnother: () => void };

/** Shown under the dropdown whose list is paired with one the post can't keep. */
export function UnpairPrompt({ id, kind, prompt }: { id: string; kind: PostKind; prompt: Prompt }) {
  return (
    <Alert id={id}>
      <AlertDescription className="text-foreground">
        {unpairText(kind, prompt.partner)}
        <span className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={prompt.onUnpair}>
            {m.trade_composer_unpair_action()}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={prompt.onPickAnother}>
            {m.trade_composer_pick_another()}
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}

/** A post option under the lists: Swap's "also pay", Sell's "also open to swaps". */
export function OptionCheck({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex min-w-0 items-start gap-2.5 rounded-lg border px-3 py-2.5 font-normal",
        disabled && "cursor-not-allowed opacity-64",
      )}
    >
      <Checkbox
        id={id}
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-describedby={`${id}-hint`}
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span id={`${id}-hint`} className="text-muted-foreground text-xs text-pretty">
          {hint}
        </span>
      </span>
    </Label>
  );
}

/** Names the lists posting will unpair, so the unpair the viewer chose stays in sight. */
export function UnpairedNote({
  lists,
  plan,
  picked,
}: {
  lists: PlanList[];
  plan: Extract<PostPlan, { ok: true }>;
  picked: { have: string | null; want: string | null; sale: string | null };
}) {
  const names = unpairedNames(lists, plan, picked);
  if (names.length === 0) return null;
  return (
    <p className="text-muted-foreground text-xs text-pretty">
      {m.trade_composer_unpaired({ name: joinList(names) })}
    </p>
  );
}
