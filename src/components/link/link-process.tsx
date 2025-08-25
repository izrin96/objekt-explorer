"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useInterval } from "usehooks-ts";
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
import type { TicketAuth, TicketSuccess } from "@/lib/universal/cosmo/shop/qr-auth";
import { msToCountdown } from "@/lib/utils";
import { Button, buttonStyles, Form, Link, Loader } from "../ui";
import { InputOTP } from "../ui/input-otp";
import AbstractProcess from "./link-abstract";

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
          <h2 className="font-semibold text-lg">
            {locale === "en" && "Link your Cosmo profile"}
            {locale === "ko" && "Cosmo 프로필을 연결하세요"}
          </h2>
          <Image
            priority
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
                Tracker to access your Cosmo, but only to verify ownership of it. Objekt Tracker
                does not store anything about your account other than wallet address and ID.
              </p>
            </div>
          )}
          {locale === "ko" && (
            <div className="flex flex-col gap-2">
              <p>
                계속 진행하기 전에 Cosmo 앱을 다운로드하고 연결하려는 Cosmo ID로 로그인해야 합니다.
              </p>
              <p>
                이 연결 과정에서 Objekt Tracker가 사용자의 Cosmo에 접근하는 것은{" "}
                <span className="font-bold">전혀</span> 불가능하며, 단지 해당 Cosmo의 소유 여부만
                확인합니다. Objekt Tracker는 지갑 주소와 ID를 제외하고는 계정에 대한 어떠한 정보도
                저장하지 않습니다.
              </p>
            </div>
          )}
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

          <Button size="sm" intent="plain" onClick={() => setStep(2)}>
            Continue with{" "}
            <Image
              className="invert dark:invert-0"
              src="/abs.svg"
              alt="Abstract logomark"
              width={20}
              height={20}
            />{" "}
            Abstract
          </Button>
        </div>
      )}
      {step === 1 && <TicketRender />}
      {step === 2 && <AbstractProcess />}
    </div>
  );
}

function TicketRender() {
  const t = useTranslations("link");
  const { data, status, refetch, isFetching, isPending } = useQuery(
    orpc.cosmoLink.getTicket.queryOptions({
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
    }),
  );

  if (isPending || isFetching)
    return (
      <div className="flex flex-col items-center gap-2">
        <Image
          priority
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

  if (status === "error")
    return (
      <div className="flex flex-col items-center gap-2">
        <Image
          priority
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

  if (status === "success") return <StepRender ticketAuth={data} refetch={refetch} />;
}

function StepRender({ ticketAuth, refetch }: { ticketAuth: TicketAuth; refetch: () => void }) {
  const queryClient = useQueryClient();
  const [expired, setExpired] = useState(false);
  const [remaining, setRemaining] = useState(0);
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

  useInterval(
    () => {
      const now = Date.now();
      const expireTime = new Date(ticketAuth.expireAt).getTime();
      const difference = expireTime - now;

      if (difference > 0) {
        setRemaining(Math.floor(difference));
      } else {
        setExpired(true);
      }
    },
    expired ? null : 1000,
  );

  useEffect(() => {
    if (data?.status === "certified") {
      queryClient.invalidateQueries({
        queryKey: orpc.profile.list.key(),
      });
    }
  }, [data?.status]);

  if (!data || data.status === "wait_for_user_action")
    return (
      <div className="flex flex-col items-center gap-2">
        <span>Scan this QR and click &apos;Continue&apos; in Cosmo app.</span>
        <span>
          Or{" "}
          <Link href={generateQrCode(ticketAuth.ticket)} intent="primary">
            click here
          </Link>{" "}
          if you are on mobile.
        </span>
        <div className="rounded bg-white p-3 shadow-lg">
          <QRCodeSVG size={200} value={generateQrCode(ticketAuth.ticket)} />
        </div>
        <span className="text-sm">Remaining {msToCountdown(remaining)}</span>
      </div>
    );

  if (data.status === "expired")
    return (
      <div className="flex flex-col items-center gap-2">
        <Image
          priority
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

  return <RenderOtp ticketAuth={ticketAuth} ticketStatus={data} />;
}

function RenderOtp({
  ticketAuth,
  ticketStatus,
}: {
  ticketAuth: TicketAuth;
  ticketStatus: TicketSuccess<"wait_for_certify" | "certified">;
}) {
  const t = useTranslations("link");
  const [value, setValue] = useState("");

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

  if (otpAndLink.isError)
    return (
      <div className="flex flex-col items-center gap-2">
        <Image
          priority
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
            setValue("");
            otpAndLink.reset();
          }}
        >
          Try again
        </Button>
      </div>
    );

  if (otpAndLink.isSuccess)
    return (
      <div className="flex flex-col items-center gap-2">
        <Image
          priority
          src={WelcomeIcon.src}
          width={220}
          height={220}
          alt="Welcome"
          className="fade-in zoom-in animate-in duration-200"
        />
        <span>{t("success", { nickname: ticketStatus.user.nickname })}</span>
        <div>
          <Link
            className={(renderProps) =>
              buttonStyles({
                ...renderProps,
                intent: "outline",
              })
            }
            href={`/@${ticketStatus.user.nickname}`}
          >
            {t("go_to_cosmo")}
          </Link>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-2">
      <Image
        priority
        src={randomIcon.src}
        alt={randomIcon.alt}
        width={220}
        height={220}
        className="fade-in zoom-in animate-in duration-200"
      />
      <span>Detected Cosmo {ticketStatus.user.nickname}</span>
      <span>Enter the verification code</span>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          otpAndLink.mutate({
            otp: Number(value),
            ticket: ticketAuth.ticket,
          });
        }}
        className="flex flex-col items-center gap-2"
      >
        <InputOTP minLength={2} maxLength={2} required value={value} onChange={setValue}>
          <InputOTP.Group>
            {[...Array(2)].map((_, index) => (
              <InputOTP.Slot key={index} index={index} />
            ))}
          </InputOTP.Group>
        </InputOTP>
        <Button type="submit" isPending={otpAndLink.isPending}>
          Submit
        </Button>
      </Form>
    </div>
  );
}
