"use client";

import { TicketAuth } from "@/lib/universal/cosmo/shop/qr-auth";
import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/trpc/client";
import { InputOTP } from "../ui/input-otp";
import { Button, buttonStyles, Form, Link, Loader } from "../ui";
import { msToCountdown } from "@/lib/utils";
import { toast } from "sonner";
import WelcomeIcon from "@/assets/icon-welcome.png";
import CatIcon from "@/assets/icon-cat.png";
import TrashIcon from "@/assets/icon-trash.png";
import CarpenterIcon from "@/assets/icon-carpenter.png";
import SmartphoneIcon from "@/assets/icon-smartphone.png";
import MugIcon from "@/assets/icon-mug.png";
import Image from "next/image";
import ReactDOM from "react-dom";

function generateQrCode(ticket: string) {
  return `cosmo://ticket-login?t=${ticket}`;
}

export default function LinkRender() {
  const utils = api.useUtils();
  const [step, setStep] = useState(0);

  // preload image icons
  ReactDOM.preload(WelcomeIcon.src, { as: "image" });
  ReactDOM.preload(CatIcon.src, { as: "image" });
  ReactDOM.preload(TrashIcon.src, { as: "image" });
  ReactDOM.preload(CarpenterIcon.src, { as: "image" });
  ReactDOM.preload(SmartphoneIcon.src, { as: "image" });
  ReactDOM.preload(MugIcon.src, { as: "image" });

  return (
    <div className="flex flex-col justify-center items-center gap-5">
      {step === 0 && (
        <div className="flex flex-col justify-center items-center max-w-xl gap-4">
          <h2 className="text-lg font-semibold">How its work</h2>
          <Image
            priority
            src={SmartphoneIcon.src}
            alt="Smartphone"
            width={220}
            height={220}
            className="animate-in fade-in zoom-in duration-200"
          />
          <p>
            You need to download the Cosmo app and sign in with the ID you want
            to link before continue.
          </p>
          <Button
            intent="primary"
            onClick={() => {
              utils.cosmoLink.getTicket.invalidate();
              setStep(1);
            }}
          >
            Continue
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
        <Image
          priority
          src={MugIcon.src}
          alt="Mug"
          width={220}
          height={220}
          className="animate-in fade-in zoom-in duration-200"
        />
        <span>Generating QR code</span>
        <Loader variant="ring" />
      </div>
    );

  if (status === "error")
    return (
      <div className="flex flex-col gap-2 items-center">
        <Image
          priority
          src={CarpenterIcon.src}
          alt="Carpenter"
          width={220}
          height={220}
          className="animate-in fade-in zoom-in duration-200"
        />
        <span>Error generating QR ticket</span>
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
  const utils = api.useUtils();
  const { data } = api.cosmoLink.checkTicket.useQuery(ticketAuth.ticket, {
    retry: false,
    refetchInterval: 2000,
    enabled: (query) => {
      return !(
        query.state.data?.status === "expired" ||
        query.state.data?.status === "certified"
      );
    },
  });

  useEffect(() => {
    if (data?.status === "certified") {
      utils.profile.getAll.invalidate();
    }
  }, [data?.status, utils.profile.getAll]);

  if (!data || data.status === "wait_for_user_action")
    return (
      <div className="flex flex-col gap-2 items-center">
        <span>Scan this QR and click &apos;Continue&apos; in Cosmo app.</span>
        <span>
          Or{" "}
          <Link href={generateQrCode(ticketAuth.ticket)} intent="primary">
            click here
          </Link>{" "}
          if you are on mobile.
        </span>
        <div className="bg-white p-3">
          <QRCodeSVG size={200} value={generateQrCode(ticketAuth.ticket)} />
        </div>
        {data && (
          <span className="text-sm">
            Remaining {msToCountdown(data.ticketRemainingMs)}
          </span>
        )}
      </div>
    );

  if (data.status === "wait_for_certify")
    return (
      <div className="flex flex-col gap-2 items-center">
        <Image
          priority
          src={CatIcon.src}
          alt="Cat"
          width={220}
          height={220}
          className="animate-in fade-in zoom-in duration-200"
        />
        <span>Detected Cosmo &apos;{data.user.nickname}&apos;</span>
        <span>Enter the verification code</span>
        <RenderOtp ticketAuth={ticketAuth} />
      </div>
    );

  if (data.status === "expired")
    return (
      <div className="flex flex-col gap-2 items-center">
        <Image
          priority
          src={TrashIcon.src}
          alt="Trash"
          width={220}
          height={220}
          className="animate-in fade-in zoom-in duration-200"
        />
        <span>QR expired</span>
        <Button intent="secondary" onClick={refetch}>
          Regenerate
        </Button>
      </div>
    );

  if (data.status === "certified")
    return (
      <div className="flex flex-col gap-2 items-center">
        <Image
          priority
          src={WelcomeIcon.src}
          width={220}
          height={220}
          alt="Welcome"
          className="animate-in fade-in zoom-in duration-200"
        />
        <span>Success. Cosmo &apos;{data.user.nickname}&apos; linked.</span>
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
            Go to your Cosmo
          </Link>
        </div>
      </div>
    );
}

function RenderOtp({ ticketAuth }: { ticketAuth: TicketAuth }) {
  const [value, setValue] = useState("");
  const [wait, setWait] = useState(false);

  const otpAndLink = api.cosmoLink.otpAndLink.useMutation({
    onSuccess: () => {
      toast.success("Successfully linked your Cosmo profile");
      setWait(true);
    },
    onError: ({ message }) => {
      toast.error(message || "Error sending OTP");
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
