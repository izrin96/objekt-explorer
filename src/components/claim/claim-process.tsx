"use client";

import { TicketAuth } from "@/lib/universal/cosmo/shop/qr-auth";
import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/trpc/client";
import { InputOTP } from "../ui/input-otp";
import { Button } from "../ui";

function generateQrCode(ticket: string) {
  return `cosmo://ticket-login?t=${ticket}`;
}

export default function ClaimProcess() {
  const { data, status } = api.cosmoClaim.getTicket.useQuery();

  return (
    <div className="flex flex-col justify-center items-center">
      {status === "pending" && "Loading"}
      {status === "error" && "Try again"}
      {status === "success" && <StepRender ticketAuth={data} />}
    </div>
  );
}

function StepRender({ ticketAuth }: { ticketAuth: TicketAuth }) {
  const { data, status } = api.cosmoClaim.checkTicket.useQuery(
    ticketAuth.ticket,
    {
      retry: false,
      refetchInterval: 2500,
    }
  );

  if (status === "error") return <div>error. try again.</div>;

  if (!data || data.status === "wait_for_user_action")
    return (
      <div>
        <QRCodeSVG size={256} value={generateQrCode(ticketAuth.ticket)} />
      </div>
    );

  if (data.status === "expired") return <div>ticket expired. try again.</div>;

  if (data.status === "wait_for_certify")
    return (
      <div>
        detected: {data.user.nickname}. <RenderOtp ticketAuth={ticketAuth} />
      </div>
    );

  if (data.status === "certified") return "success";
}

function RenderOtp({ ticketAuth }: { ticketAuth: TicketAuth }) {
  const [value, setValue] = useState("");

  const otpAndLink = api.cosmoClaim.otpAndLink.useMutation();

  return (
    <div>
      <InputOTP maxLength={2} value={value} onChange={setValue}>
        <InputOTP.Group>
          {[...Array(2)].map((_, index) => (
            <InputOTP.Slot key={index} index={index} />
          ))}
        </InputOTP.Group>
      </InputOTP>
      <Button
        onClick={() =>
          otpAndLink.mutate({
            otp: parseInt(value),
            ticket: ticketAuth.ticket,
          })
        }
      >
        submit
      </Button>
    </div>
  );
}
