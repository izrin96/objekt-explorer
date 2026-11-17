import { CheckCircleIcon } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { m } from "@/paraglide/messages";

import { codeInput, type FlowState, parseCode, remaining, retryLabel } from "./connect-flow";
import type { ConnectFlow } from "./use-connect-flow";

/** What the live region says for each state; the countdown is outside it, so it never announces. */
function statusText(state: FlowState) {
  switch (state.kind) {
    case "minting":
      return m.cosmo_session_minting();
    case "qr":
      return m.cosmo_session_scan();
    case "code":
    case "submitting":
      return state.nickname === null
        ? m.cosmo_session_signing_in()
        : m.cosmo_session_signing_in_as({ name: state.nickname });
    case "wrongCode":
      return m.api_errors_cosmo_session_wrong_code();
    case "connected":
      return m.cosmo_session_connected_title({ name: state.nickname });
    case "expired":
      return m.api_errors_cosmo_session_expired();
    case "cosmoError":
      return m.api_errors_cosmo_session_cosmo_error();
    case "unavailable":
      return m.api_errors_cosmo_session_unavailable();
    case "busy":
      return m.api_errors_cosmo_session_busy();
    case "limit":
      return m.api_errors_cosmo_session_limit();
    case "notAllowed":
      return m.api_errors_cosmo_session_not_allowed();
    case "rateLimited":
      return m.api_errors_user_rate_limit();
  }
}

const isProblem = (state: FlowState) =>
  state.kind !== "minting" &&
  state.kind !== "qr" &&
  state.kind !== "code" &&
  state.kind !== "submitting" &&
  state.kind !== "connected";

export function ConnectDialog({ flow }: { flow: ConnectFlow }) {
  const { view } = flow;
  const retry = retryLabel(view);

  return (
    <Dialog
      open={flow.open}
      onOpenChange={(open) => {
        if (!open) flow.close();
      }}
    >
      <DialogPopup className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">{m.cosmo_session_dialog_title()}</DialogTitle>
        </DialogHeader>
        <DialogPanel className="flex flex-col items-center gap-4 text-center">
          {view.kind === "qr" && <QrStep flow={flow} qr={view.qr} expiresAt={view.expiresAt} />}
          {(view.kind === "code" || view.kind === "submitting" || view.kind === "wrongCode") && (
            <CodeStep flow={flow} state={view} />
          )}
          {view.kind === "minting" && (
            <Spinner aria-hidden role="presentation" className="text-muted-foreground size-5" />
          )}
          {view.kind === "connected" && (
            <CheckCircleIcon weight="fill" className="text-success-foreground size-8" />
          )}
          {/* the one live region: each state change is announced once, and a wrong code reads as an error */}
          <p
            role="status"
            className={
              isProblem(view) ? "text-destructive-foreground text-sm text-pretty" : "text-sm"
            }
          >
            {statusText(view)}
          </p>
        </DialogPanel>
        <DialogFooter>
          {view.kind === "connected" ? (
            <Button autoFocus onClick={flow.close}>
              {m.cosmo_session_done()}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={flow.close}>
                {isProblem(view) ? m.common_modal_close() : m.common_modal_cancel()}
              </Button>
              {retry !== null && (
                <Button autoFocus onClick={flow.start}>
                  {retry === "new" ? m.cosmo_session_new_code() : m.cosmo_session_try_again()}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function QrStep({ flow, qr, expiresAt }: { flow: ConnectFlow; qr: string; expiresAt: number }) {
  return (
    <>
      {/* scanners need dark on light with a quiet zone, in both themes */}
      <div className="w-full max-w-52 rounded-xl bg-white p-3">
        <QRCodeSVG
          value={qr}
          size={192}
          level="M"
          marginSize={4}
          bgColor="#ffffff"
          fgColor="#000000"
          role="img"
          aria-label={m.cosmo_session_qr_label()}
          className="h-auto w-full"
        />
      </div>
      <p className="text-muted-foreground text-sm tabular-nums">
        {m.cosmo_session_expires_in({ time: remaining(expiresAt, flow.now) })}
      </p>
      <div className="flex flex-col items-center gap-1.5">
        <Button variant="outline" size="sm" render={<a href={qr} />}>
          {m.cosmo_session_open_cosmo()}
        </Button>
        <span className="text-muted-foreground text-xs">{m.cosmo_session_open_cosmo_hint()}</span>
      </div>
    </>
  );
}

function CodeStep({
  flow,
  state,
}: {
  flow: ConnectFlow;
  state: Extract<FlowState, { kind: "code" | "submitting" | "wrongCode" }>;
}) {
  const [code, setCode] = useState("");
  const otp = parseCode(code);
  const sending = state.kind === "submitting";

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (otp === null || sending) return;
    // a wrong code clears the field for another try, so it clears on send
    setCode("");
    flow.submit(otp);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col items-center gap-3">
      <p className="text-muted-foreground text-sm text-pretty">{m.cosmo_session_code_hint()}</p>
      <div className="flex w-32 flex-col gap-1.5 text-start">
        <Label htmlFor="cosmo-session-code">{m.cosmo_session_code_label()}</Label>
        <Input
          id="cosmo-session-code"
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={2}
          // readOnly rather than disabled while sending, so the field keeps its focus
          readOnly={sending}
          aria-invalid={state.kind === "wrongCode"}
          className="font-mono"
          value={code}
          onChange={(event) => setCode(codeInput(event.target.value))}
        />
      </div>
      <p className="text-muted-foreground text-sm tabular-nums">
        {m.cosmo_session_code_expires_in({ time: remaining(state.codeExpiresAt, flow.now) })}
      </p>
      <Button type="submit" disabled={otp === null} loading={sending}>
        {m.cosmo_session_code_submit()}
      </Button>
    </form>
  );
}
