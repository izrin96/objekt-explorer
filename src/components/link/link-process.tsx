"use client";

import { TicketAuth } from "@/lib/universal/cosmo/shop/qr-auth";
import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/trpc/client";
import { InputOTP } from "../ui/input-otp";
import {
  Ghost,
  HeartBreak,
  Person,
  SealCheck,
} from "@phosphor-icons/react/dist/ssr";
import { Button, buttonStyles, Form, Link, Loader, Note } from "../ui";

function generateQrCode(ticket: string) {
  return `cosmo://ticket-login?t=${ticket}`;
}

export default function LinkRender() {
  const utils = api.useUtils();
  const [step, setStep] = useState(0);
  return (
    <div className="flex flex-col justify-center items-center gap-5">
      <Note className="max-w-xl" intent="default">
        Please note that this feature is still under testing.
      </Note>

      {step === 0 && (
        <div className="flex flex-col justify-center items-center max-w-xl gap-4">
          <h2 className="text-lg font-semibold">How its work</h2>
          <p>
            You need to download the COSMO app and sign in with the COSMO ID you
            want to link before proceeding. During this process, you will be
            required to scan a QR code to verify with COSMO app.
          </p>
          <Button
            intent="secondary"
            onClick={() => {
              utils.cosmoLink.getTicket.invalidate();
              setStep(1);
            }}
          >
            Proceed
          </Button>
        </div>
      )}
      {step === 1 && <TicketRender />}
    </div>
  );
}

function TicketRender() {
  const { data, status, refetch, isRefetching, isLoading } =
    api.cosmoLink.getTicket.useQuery(undefined, {
      staleTime: Infinity,
      retry: false,
    });

  if (isRefetching || isLoading)
    return (
      <div className="flex flex-col gap-2 items-center">
        <span>Getting QR code from COSMO</span>
        <Loader variant="ring" />
      </div>
    );

  if (status === "error")
    return (
      <div className="flex flex-col gap-2 items-center">
        <HeartBreak size={52} />
        <span>Error getting QR ticket from COSMO</span>
        <Button intent="secondary" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );

  if (status === "success")
    return <StepRender ticketAuth={data} refetch={refetch} />;
}

function StepRender({
  ticketAuth,
  refetch,
}: {
  ticketAuth: TicketAuth;
  refetch: () => void;
}) {
  const [enabled, setEnable] = useState(true);
  const { data } = api.cosmoLink.checkTicket.useQuery(ticketAuth.ticket, {
    retry: false,
    refetchInterval: 2500,
    enabled: enabled,
  });

  useEffect(() => {
    if (data?.status === "expired" || data?.status === "certified") {
      setEnable(false);
    }
  }, [data?.status]);

  if (!data || data.status === "wait_for_user_action")
    return (
      <div className="flex flex-col gap-2 items-center">
        <span>Scan this QR and click &apos;Continue&apos; in COSMO app.</span>
        <span>
          Or{" "}
          <Link href={generateQrCode(ticketAuth.ticket)} intent="primary">
            click here
          </Link>{" "}
          if you are on mobile.
        </span>
        <QRCodeSVG size={256} value={generateQrCode(ticketAuth.ticket)} />
      </div>
    );

  if (data.status === "wait_for_certify")
    return (
      <div className="flex flex-col gap-2 items-center">
        <Person size={52} />
        <span>Detected COSMO ID &apos;{data.user.nickname}&apos;</span>
        <RenderOtp ticketAuth={ticketAuth} />
      </div>
    );

  if (data.status === "expired")
    return (
      <div className="flex flex-col gap-2 items-center">
        <Ghost size={52} />
        <span>QR expired</span>
        <Button intent="secondary" onClick={refetch}>
          Regenerate
        </Button>
      </div>
    );

  if (data.status === "certified")
    return (
      <div className="flex flex-col gap-2 items-center">
        <SealCheck size={52} />
        <span>Success. Cosmo ID &apos;{data.user.nickname}&apos; linked.</span>
        <div>
          <Link
            className={(renderProps) =>
              buttonStyles({
                ...renderProps,
                intent: "secondary",
              })
            }
            href={`/@${data.user.nickname}`}
          >
            Visit your ID
          </Link>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-2 items-center">
      <HeartBreak size={52} />
      <span>Process failed</span>
      <Button intent="secondary" onClick={refetch}>
        Try again
      </Button>
    </div>
  );
}

function RenderOtp({ ticketAuth }: { ticketAuth: TicketAuth }) {
  const [value, setValue] = useState("");
  const [wait, setWait] = useState(false);

  const otpAndLink = api.cosmoLink.otpAndLink.useMutation({
    onSuccess: () => {
      setWait(true);
    },
  });

  if (otpAndLink.isError)
    return (
      <div className="flex flex-col gap-2 items-center">
        <span>{otpAndLink.failureReason?.message}</span>
        <Button intent="secondary" onClick={() => otpAndLink.reset()}>
          Try again
        </Button>
      </div>
    );

  return (
    <div className="flex flex-col gap-2 items-center">
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          otpAndLink.mutate({
            otp: parseInt(value),
            ticket: ticketAuth.ticket,
          });
        }}
        className="flex flex-col gap-2 items-center"
      >
        <InputOTP maxLength={2} value={value} onChange={setValue}>
          <InputOTP.Group>
            {[...Array(2)].map((_, index) => (
              <InputOTP.Slot key={index} index={index} />
            ))}
          </InputOTP.Group>
        </InputOTP>
        <Button type="submit" isPending={otpAndLink.isPending || wait}>
          Submit
        </Button>
      </Form>
    </div>
  );
}
