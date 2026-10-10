import { PlusIcon, WarningIcon, XIcon } from "@phosphor-icons/react";
import type { TopupPayer } from "@repo/api/schemas/offer";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumberField, NumberFieldGroup, NumberFieldInput } from "@/components/ui/number-field";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedChoice } from "@/features/offers/segmented-choice";
import { currencyName, formatCurrency, useCurrency } from "@/features/settings/use-currency";
import { m } from "@/paraglide/messages";

export function Topup({
  on,
  onToggle,
  amount,
  onAmount,
  currency,
  onCurrency,
  payer,
  onPayer,
  name,
}: {
  on: boolean;
  onToggle: (on: boolean) => void;
  amount: number | null;
  onAmount: (amount: number | null) => void;
  currency: string;
  onCurrency: (currency: string) => void;
  payer: TopupPayer;
  onPayer: (payer: TopupPayer) => void;
  name: string;
}) {
  const { codes } = useCurrency();
  const amountId = useId();
  const currencyId = useId();
  const headingId = useId();
  // the chosen code stays selectable before the rates answer
  const options = codes.includes(currency) ? codes : [...codes, currency].toSorted();

  if (!on) {
    return (
      <Button variant="ghost" size="sm" className="self-start" onClick={() => onToggle(true)}>
        <PlusIcon />
        {m.offer_topup_add()}
      </Button>
    );
  }

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-sm font-medium">
          {m.offer_topup_title()}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => onToggle(false)}>
          <XIcon />
          {m.offer_topup_remove()}
        </Button>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,7rem)] gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,8rem)_auto]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={amountId}>{m.offer_topup_amount()}</Label>
          <NumberField
            id={amountId}
            value={amount}
            onValueChange={onAmount}
            min={0}
            format={{ maximumFractionDigits: 2 }}
          >
            <NumberFieldGroup>
              <NumberFieldInput className="text-start tabular-nums" />
            </NumberFieldGroup>
          </NumberField>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={currencyId}>{m.offer_topup_currency()}</Label>
          <Select
            value={currency}
            onValueChange={(v: string | null) => v !== null && onCurrency(v)}
          >
            <SelectTrigger id={currencyId} className="min-w-0">
              <SelectValue>{(v: string) => <span className="font-mono">{v}</span>}</SelectValue>
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false} className="max-h-72">
              {options.map((code) => (
                <SelectItem key={code} value={code}>
                  <span className="font-mono">{code}</span>
                  <span className="text-muted-foreground ml-2">{currencyName(code)}</span>
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
        <SegmentedChoice
          label={m.offer_topup_payer()}
          options={[
            { value: "from", label: m.offer_topup_payer_you() },
            { value: "to", label: m.offer_topup_payer_them({ name }) },
          ]}
          value={payer}
          onChange={onPayer}
          className="col-span-full self-end sm:col-span-1"
        />
      </div>
      <p className="text-warning-foreground flex items-start gap-1.5 text-sm text-pretty">
        <WarningIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
        <span>
          {amount !== null && amount > 0
            ? payer === "from"
              ? m.offer_topup_you_pay({ amount: formatCurrency(amount, currency) })
              : m.offer_topup_they_pay({ amount: formatCurrency(amount, currency) })
            : m.offer_topup_unverified()}
        </span>
      </p>
    </section>
  );
}
