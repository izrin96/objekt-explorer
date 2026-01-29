"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { Form } from "react-aria-components";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useInterval } from "usehooks-ts";

import type { TicketAuth, TicketSuccess } from "@/lib/universal/cosmo/shop/qr-auth";

import AxolotlIcon from "@/assets/icon-axolotl.png";
import BearIcon from "@/assets/icon-bear.png";
import CarpenterIcon from "@/assets/icon-carpenter.png";
import CatIcon from "@/assets/icon-cat.png";
import DeerIcon from "@/assets/icon-deer.png";
import IconError from "@/assets/icon-error.png";
import GiraffeIcon from "@/assets/icon-giraffe.png";
import PandaIcon from "@/assets/icon-panda.png";
import QRCodeIcon from "@/assets/icon-qrcode.png";
import SmartphoneIcon from "@/assets/icon-smartphone.png";
import SquirrelIcon from "@/assets/icon-squirrel.png";
import TrashIcon from "@/assets/icon-trash.png";
import WelcomeIcon from "@/assets/icon-welcome.png";
import WhiteFoxIcon from "@/assets/icon-white-fox.png";
import { orpc } from "@/lib/orpc/client";
import { msToCountdown, SITE_NAME } from "@/lib/utils";

import { Button, buttonStyles } from "../ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { Link } from "../ui/link";
import { Loader } from "../ui/loader";
import { Note } from "../ui/note";

function generateQrCode(ticket: string) {
  return `cosmo://ticket-login?t=${ticket}`;
}

export default function LinkRender() {
  const queryClient = useQueryClient();
  const locale = useLocale();
  const [step, setStep] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center gap-5">
      {step === 0 && (
        <div className="flex max-w-xl flex-col items-center justify-center gap-4">
          <Note intent="info">
            This linking process will get updated with new method soon. We are still working on it.
          </Note>
          <h2 className="text-lg font-semibold">
            {locale === "en" && "Link your Cosmo profile"}
            {locale === "ko" && "Cosmo 프로필을 연결하세요"}
          </h2>
          <Image
            src={SmartphoneIcon.src}
            alt="Smartphone"
            width={220}
            height={220}
            className="fade-in zoom-in animate-in duration-200"
          />
          {locale === "en" && (
            <div className="flex flex-col gap-2">
              <p>
                You need to download the Cosmo app and sign in with the Cosmo ID you want to link
                before continuing.
              </p>
              <p>
                This linking process will <span className="font-bold">not</span> allow Objekt
                Tracker to access your Cosmo, but only to verify ownership of it. {SITE_NAME} does
                not store anything about your account other than wallet address and ID.
              </p>
            </div>
          )}
          {locale === "ko" && (
            <div className="flex flex-col gap-2">
              <p>
                계속 진행하기 전에 Cosmo 앱을 다운로드하고 연결하려는 Cosmo ID로 로그인해야 합니다.
              </p>
              <p>
                이 연결 과정에서 {SITE_NAME}가 사용자의 Cosmo에 접근하는 것은{" "}
                <span className="font-bold">전혀</span> 불가능하며, 단지 해당 Cosmo의 소유 여부만
                확인합니다. {SITE_NAME}는 지갑 주소와 ID를 제외하고는 계정에 대한 어떠한 정보도
                저장하지 않습니다.
              </p>
            </div>
          )}
          <Button
            size="md"
            intent="outline"
            onClick={() => {
              void queryClient.invalidateQueries({
                queryKey: orpc.cosmoLink.getTicket.key(),
              });
              setStep(1);
            }}
          >
            Continue with Cosmo app
          </Button>
        </div>
      )}
      {step === 1 && <TicketRender />}
    </div>
  );
}

function TicketRender() {
  const t = useTranslations("link");
  const { data, status, refetch, isFetching } = useQuery(
    orpc.cosmoLink.getTicket.queryOptions({
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
    }),
  );

  if (isFetching) {
    return (
      <div className="flex flex-col items-center gap-2">
        <Image
          src={QRCodeIcon.src}
          alt="Loading"
          width={220}
          height={220}
          className="fade-in zoom-in animate-in duration-200"
        />
        <span>{t("generating_qr")}</span>
        <Loader variant="ring" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-2">
        <Image
          src={CarpenterIcon.src}
          alt="Carpenter"
          width={220}
          height={220}
          className="fade-in zoom-in animate-in duration-200"
        />
        <span>{t("error_generating_qr")}</span>
        <Button intent="outline" onClick={() => refetch()}>
          {t("try_again")}
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
      input: ticketAuth.ticket,
      retry: false,
      refetchInterval: 2000,
      enabled: (query) => {
        return query.state.data?.status !== "expired" && query.state.data?.status !== "certified";
      },
    }),
  );

  useEffect(() => {
    if (data?.status === "certified") {
      void queryClient.invalidateQueries({
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
          <Link href={generateQrCode(ticketAuth.ticket)} className="underline">
            click here
          </Link>{" "}
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
        <Image
          src={TrashIcon.src}
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
  const t = useTranslations("link");

  const { handleSubmit, control, reset } = useForm({
    defaultValues: {
      otp: "",
    },
  });

  const [randomIcon] = useState(() => {
    const icons = [
      { src: AxolotlIcon.src, alt: "Axolotl" },
      { src: DeerIcon.src, alt: "Deer" },
      { src: PandaIcon.src, alt: "Panda" },
      { src: SquirrelIcon.src, alt: "Squirrel" },
      { src: BearIcon.src, alt: "Bear" },
      { src: CatIcon.src, alt: "Cat" },
      { src: GiraffeIcon.src, alt: "Giraffe" },
      { src: WhiteFoxIcon.src, alt: "White Fox" },
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
        <Image
          src={IconError.src}
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
        <Image
          src={WelcomeIcon.src}
          width={220}
          height={220}
          alt="Welcome"
          className="fade-in zoom-in animate-in duration-200"
        />
        <span>{t("success", { nickname: ticketStatus.user.nickname })}</span>
        <div>
          <Link
            className={buttonStyles({
              intent: "outline",
            })}
            href={`/@${ticketStatus.user.nickname}`}
          >
            {t("go_to_cosmo")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Image
        src={randomIcon!.src}
        alt={randomIcon!.alt}
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
              <InputOTPGroup>
                {[...Array(2)].map((_, index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
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
