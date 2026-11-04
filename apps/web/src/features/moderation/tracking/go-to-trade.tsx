import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isNotFound } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

import { parseTradeNumber } from "./format";
import { staffTradeOptions } from "./queries";

export function GoToTrade() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const inputId = useId();
  const errorId = useId();

  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get("trade");
    const tradeId = parseTradeNumber(typeof text === "string" ? text : "");
    if (tradeId === null) {
      setError(m.mod_trades_goto_invalid());
      return;
    }
    setError(null);
    setLooking(true);
    try {
      // looked up first, so a number with no trade stays on the tab with its message
      await queryClient.fetchQuery(staffTradeOptions(tradeId));
      await navigate({ to: "/mod/trades/$tradeId", params: { tradeId: String(tradeId) } });
    } catch (caught) {
      setError(isNotFound(caught) ? m.mod_trades_goto_missing() : m.mod_trades_goto_failed());
    } finally {
      setLooking(false);
    }
  }

  return (
    <form noValidate onSubmit={(event) => void open(event)} className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-muted-foreground text-xs">
        {m.mod_trades_goto_label()}
      </label>
      <div className="flex gap-1.5">
        <Input
          id={inputId}
          name="trade"
          size="sm"
          autoComplete="off"
          placeholder={m.mod_trades_goto_placeholder()}
          className="w-28 font-mono"
          aria-invalid={error === null ? undefined : true}
          aria-describedby={errorId}
          onChange={() => setError(null)}
        />
        <Button type="submit" size="sm" variant="outline" disabled={looking}>
          {m.mod_trades_goto_submit()}
        </Button>
      </div>
      <p
        id={errorId}
        aria-live="polite"
        className="text-destructive-foreground text-xs empty:hidden"
      >
        {error}
      </p>
    </form>
  );
}
