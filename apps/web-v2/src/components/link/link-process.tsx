import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useInterval } from "usehooks-ts";
import { orpc } from "@/lib/orpc/client";
import type { TicketAuth, TicketSuccess } from "@/lib/universal/cosmo/shop/qr-auth";
import { msToCountdown } from "@/lib/utils";
import { Button, buttonStyles } from "../ui/button";
import { Form } from "../ui/form";
import { InputOTP } from "../ui/input-otp";
import { Link } from "../ui/link";
import { Loader } from "../ui/loader";

function generateQrCode(ticket: string) {
  return `cosmo://ticket-login?t=${ticket}`;
}

export default function LinkRender() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center gap-5">
      {step === 0 && (
        <div className="flex max-w-xl flex-col items-center justify-center gap-4">
          <h2 className="font-semibold text-lg">Link your Cosmo profile</h2>
          <img
            src="/3d-icons/icon-smartphone.png"
            alt="Smartphone"
            width={220}
            height={220}
            className="fade-in zoom-in animate-in duration-200"
          />
          <div className="flex flex-col gap-2">
            <p>
              You need to download the Cosmo app and sign in with the Cosmo ID you want to link
              before continuing.
            </p>
            <p>
              This linking process will <span className="font-bold">not</span> allow Objekt Tracker
              to access your Cosmo, but only to verify ownership of it. Objekt Tracker does not
              store anything about your account other than wallet address and ID.
            </p>
          </div>
          <Button
            size="md"
            intent="outline"
            onClick={() => {
              queryClient.invalidateQueries({
                queryKey: orpc.cosmoLink.getTicket.key(),
              });
              setStep(1);
            }}
          >
            Continue with Cosmo app
          </Button>

          <div className="relative my-2 flex w-full items-center justify-center text-sm">
            <div className="absolute inset-0 flex items-center">
              <div className="h-px w-full shrink-0 bg-border"></div>
            </div>
            <span className="relative bg-bg px-3 text-muted-fg text-xs">OR</span>
          </div>

          <Link
            className={buttonStyles({
              size: "sm",
              intent: "plain",
            })}
            to="/link/connect/abstract"
          >
            Continue with{" "}
            <img
              className="invert dark:invert-0"
              src="/abs.svg"
              alt="Abstract logomark"
              width={20}
              height={20}
            />{" "}
            Abstract
          </Link>
        </div>
      )}
      {step === 1 && <TicketRender />}
    </div>
  );
}

function TicketRender() {
  const { data, status, refetch, isFetching } = useQuery(
    orpc.cosmoLink.getTicket.queryOptions({
      staleTime: Infinity,
      retry: false,
    }),
  );

  if (isFetching) {
    return (
      <div className="flex flex-col items-center gap-2">
        <img
          src="/3d-icons/icon-qrcode.png"
          alt="Loading"
          width={220}
          height={220}
          className="fade-in zoom-in animate-in duration-200"
        />
        <span>Generating QR code</span>
        <Loader variant="ring" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-2">
        <img
          src="/3d-icons/icon-carpenter.png"
          alt="Carpenter"
          width={220}
          height={220}
          className="fade-in zoom-in animate-in duration-200"
        />
        <span>Error generating QR ticket</span>
        <Button intent="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (status === "success") {
    return <StepRender ticketAuth={data} refetch={refetch} />;
  }
}

function StepRender({ ticketAuth, refetch }: { ticketAuth: TicketAuth; refetch: () => void }) {
  const queryClient = useQueryClient();
  const { data } = useQuery(
    orpc.cosmoLink.checkTicket.queryOptions({
      input: { ticket: ticketAuth.ticket },
      retry: false,
      refetchInterval: 2000,
      enabled: (query) => {
        return query.state.data?.status !== "expired" && query.state.data?.status !== "certified";
      },
    }),
  );

  useEffect(() => {
    if (data?.status === "certified") {
      queryClient.invalidateQueries({
        queryKey: orpc.profile.list.key(),
      });
    }
  }, [data?.status]);

  if (!data || data.status === "wait_for_user_action") {
    return (
      <div className="flex flex-col items-center gap-2">
        <span>Scan this QR and click &apos;Continue&apos; in Cosmo app.</span>
        <span>
          Or{" "}
          <a href={generateQrCode(ticketAuth.ticket)} className="underline">
            click here
          </a>{" "}
          if you are on mobile.
        </span>
        <div className="rounded-lg bg-white p-3 shadow-lg">
          <QRCodeSVG size={200} value={generateQrCode(ticketAuth.ticket)} />
        </div>
        {data?.status === "wait_for_user_action" && (
          <Countdown ticketRemainingMs={data?.ticketRemainingMs} />
        )}
      </div>
    );
  }

  if (data.status === "expired") {
    return (
      <div className="flex flex-col items-center gap-2">
        <img
          src="/3d-icons/icon-trash.png"
          alt="Trash"
          width={220}
          height={220}
          className="fade-in zoom-in animate-in duration-200"
        />
        <span>QR expired</span>
        <Button intent="outline" onClick={refetch}>
          Regenerate
        </Button>
      </div>
    );
  }

  return <RenderOtp ticketAuth={ticketAuth} ticketStatus={data} />;
}

function Countdown({ ticketRemainingMs }: { ticketRemainingMs: number }) {
  const [remaining, setRemaining] = useState(ticketRemainingMs);

  useInterval(() => {
    setRemaining((prev) => Math.max(prev - 1000, 0));
  }, 1000);

  return <span className="text-sm">Remaining {msToCountdown(remaining)}</span>;
}

function RenderOtp({
  ticketAuth,
  ticketStatus,
}: {
  ticketAuth: TicketAuth;
  ticketStatus: TicketSuccess<"wait_for_certify" | "certified">;
}) {
  const { handleSubmit, control, reset } = useForm({
    defaultValues: {
      otp: "",
    },
  });

  const [randomIcon] = useState(() => {
    const icons = [
      { src: "/3d-icons/icon-axolotl.png", alt: "Axolotl" },
      { src: "/3d-icons/icon-deer.png", alt: "Deer" },
      { src: "/3d-icons/icon-panda.png", alt: "Panda" },
      { src: "/3d-icons/icon-squirrel.png", alt: "Squirrel" },
      { src: "/3d-icons/icon-bear.png", alt: "Bear" },
      { src: "/3d-icons/icon-cat.png", alt: "Cat" },
      { src: "/3d-icons/icon-giraffe.png", alt: "Giraffe" },
      { src: "/3d-icons/icon-white-fox.png", alt: "White Fox" },
    ];
    return icons[Math.floor(Math.random() * icons.length)];
  });

  const otpAndLink = useMutation(
    orpc.cosmoLink.otpAndLink.mutationOptions({
      onSuccess: () => {
        toast.success("Successfully linked your Cosmo profile");
      },
      onError: ({ message }) => {
        toast.error(message || "Error sending OTP");
      },
    }),
  );

  const onSubmit = handleSubmit((data) => {
    otpAndLink.mutate({
      otp: Number(data.otp),
      ticket: ticketAuth.ticket,
    });
  });

  if (otpAndLink.isError) {
    return (
      <div className="flex flex-col items-center gap-2">
        <img
          src="/3d-icons/icon-error.png"
          alt="Error"
          width={220}
          height={220}
          className="fade-in zoom-in animate-in duration-200"
        />
        <span>{otpAndLink.error.message}</span>
        <Button
          intent="outline"
          onClick={() => {
            reset();
            otpAndLink.reset();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (otpAndLink.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-2">
        <img
          src="/3d-icons/icon-welcome.png"
          width={220}
          height={220}
          alt="Welcome"
          className="fade-in zoom-in animate-in duration-200"
        />
        <span>Success. Cosmo {ticketStatus.user.nickname} linked.</span>
        <div>
          <Link
            className={buttonStyles({
              intent: "outline",
            })}
            to="/@{$nickname}"
            params={{ nickname: ticketStatus.user.nickname }}
          >
            Go to your Cosmo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={randomIcon.src}
        alt={randomIcon.alt}
        width={220}
        height={220}
        className="fade-in zoom-in animate-in duration-200"
      />
      <span>Detected Cosmo {ticketStatus.user.nickname}</span>
      <span>Enter the verification code</span>
      <Form onSubmit={onSubmit} className="flex flex-col items-center gap-2">
        <Controller
          control={control}
          name="otp"
          rules={{
            required: "OTP code is required.",
            minLength: 2,
            maxLength: 2,
          }}
          render={({ field: { value, onChange } }) => (
            <InputOTP minLength={2} maxLength={2} required value={value} onChange={onChange}>
              <InputOTP.Group>
                {[...Array(2)].map((_, index) => (
                  <InputOTP.Slot key={index} index={index} />
                ))}
              </InputOTP.Group>
            </InputOTP>
          )}
        />
        <Button type="submit" isPending={otpAndLink.isPending}>
          Submit
        </Button>
      </Form>
      <Countdown ticketRemainingMs={ticketStatus.ticketOtpRemainingMs} />
    </div>
  );
}
