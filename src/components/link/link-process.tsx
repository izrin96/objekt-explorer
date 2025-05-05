"use client";

import { TicketAuth } from "@/lib/universal/cosmo/shop/qr-auth";
import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/trpc/client";
import { InputOTP } from "../ui/input-otp";
import { Button, buttonStyles, Form, Link, Loader } from "../ui";

function generateQrCode(ticket: string) {
  return `cosmo://ticket-login?t=${ticket}`;
}

export default function LinkRender() {
  return (
    <div className="flex flex-col justify-center items-center">
      <TicketRender />
    </div>
  );
}

function TicketRender() {
  const { data, status, refetch, isRefetching, isLoading } =
    api.cosmoClaim.getTicket.useQuery(undefined, {
      staleTime: Infinity,
    });

  if (isRefetching || isLoading) return <Loader variant="ring" />;

  if (status === "error")
    return (
      <div className="flex flex-col gap-2">
        <span>Error</span>
        <Button onClick={() => refetch()}>Try again</Button>
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
  const { data } = api.cosmoClaim.checkTicket.useQuery(ticketAuth.ticket, {
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
      <div className="flex flex-col gap-2">
        <span>Scan QR</span>
        <QRCodeSVG size={256} value={generateQrCode(ticketAuth.ticket)} />
      </div>
    );

  if (data.status === "expired")
    return (
      <div className="flex flex-col gap-2">
        <span>Ticket expired</span>
        <Button onClick={refetch}>Try again</Button>
      </div>
    );

  if (data.status === "wait_for_certify")
    return (
      <div className="flex flex-col gap-2">
        <span>Detected: {data.user.nickname}</span>
        <RenderOtp ticketAuth={ticketAuth} />
      </div>
    );

  if (data.status === "certified")
    return (
      <div className="flex flex-col gap-2 items-center">
        <span>Success. Cosmo ID linked.</span>
        <div>
          <Link
            className={(renderProps) =>
              buttonStyles({
                ...renderProps,
                size: "extra-small",
                intent: "secondary",
              })
            }
            href={`/@${data.user.nickname}`}
          >
            Go to profile
          </Link>
        </div>
      </div>
    );
}

function RenderOtp({ ticketAuth }: { ticketAuth: TicketAuth }) {
  const [value, setValue] = useState("");
  const [wait, setWait] = useState(false);

  const otpAndLink = api.cosmoClaim.otpAndLink.useMutation({
    onSuccess: () => {
      setWait(true);
    },
  });

  return (
    <div className="flex flex-col gap-2">
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
