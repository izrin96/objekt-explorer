"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AxolotlIcon from "@/assets/icon-axolotl.png";
import BearIcon from "@/assets/icon-bear.png";
import CarpenterIcon from "@/assets/icon-carpenter.png";
import CatIcon from "@/assets/icon-cat.png";
import DeerIcon from "@/assets/icon-deer.png";
import GiraffeIcon from "@/assets/icon-giraffe.png";
import PandaIcon from "@/assets/icon-panda.png";
import QRCodeIcon from "@/assets/icon-qrcode.png";
import SmartphoneIcon from "@/assets/icon-smartphone.png";
import SquirrelIcon from "@/assets/icon-squirrel.png";
import TrashIcon from "@/assets/icon-trash.png";
import WelcomeIcon from "@/assets/icon-welcome.png";
import WhiteFoxIcon from "@/assets/icon-white-fox.png";
import { orpc } from "@/lib/orpc/client";
import type { TicketAuth } from "@/lib/universal/cosmo/shop/qr-auth";
import { msToCountdown } from "@/lib/utils";
import { Button, buttonStyles, Form, Link, Loader } from "../ui";
import { InputOTP } from "../ui/input-otp";

function generateQrCode(ticket: string) {
  return `cosmo://ticket-login?t=${ticket}`;
}

export default function LinkRender() {
  const queryClient = useQueryClient();
  const t = useTranslations("link");
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
            <p>
              You need to download the Cosmo app and sign in with the Cosmo ID you want to link
              before continuing. This linking process will <span className="font-bold">not</span>{" "}
              allow Objekt Tracker to access your Cosmo, but only to verify ownership of it. Objekt
              Tracker does not store anything about your account other than wallet address and ID.
            </p>
          )}
          {locale === "ko" && (
            <p>
              계속 진행하기 전에 Cosmo 앱을 다운로드하고 연결하려는 Cosmo ID로 로그인해야 합니다. 이
              연결 과정에서 Objekt Tracker가 사용자의 Cosmo에 접근하는 것은{" "}
              <span className="font-bold">전혀</span> 불가능하며, 단지 해당 Cosmo의 소유 여부만
              확인합니다. Objekt Tracker는 지갑 주소와 ID를 제외하고는 계정에 대한 어떠한 정보도
              저장하지 않습니다.
            </p>
          )}
          <Button
            intent="primary"
            onClick={() => {
              queryClient.invalidateQueries({
                queryKey: orpc.cosmoLink.getTicket.key(),
              });
              setStep(1);
            }}
          >
            {t("continue")}
          </Button>
        </div>
      )}
      {step === 1 && <TicketRender />}
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
        <Button intent="secondary" onClick={() => refetch()}>
          {t("try_again")}
        </Button>
      </div>
    );

  if (status === "success") return <StepRender ticketAuth={data} refetch={refetch} />;
}

function StepRender({ ticketAuth, refetch }: { ticketAuth: TicketAuth; refetch: () => void }) {
  const queryClient = useQueryClient();
  const t = useTranslations("link");
  const { data } = useQuery(
    orpc.cosmoLink.checkTicket.queryOptions({
      input: ticketAuth.ticket,
      retry: false,
      refetchInterval: 2000,
      enabled: (query) => {
        return !(
          query.state.data?.status === "expired" || query.state.data?.status === "certified"
        );
      },
    }),
  );

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
        {data && <span className="text-sm">Remaining {msToCountdown(data.ticketRemainingMs)}</span>}
      </div>
    );

  if (data.status === "wait_for_certify")
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
        <span>Detected Cosmo &apos;{data.user.nickname}&apos;</span>
        <span>Enter the verification code</span>
        <RenderOtp ticketAuth={ticketAuth} />
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
        <Button intent="secondary" onClick={refetch}>
          Regenerate
        </Button>
      </div>
    );

  if (data.status === "certified")
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
        <span>{t("success", { nickname: data.user.nickname })}</span>
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
            {t("go_to_cosmo")}
          </Link>
        </div>
      </div>
    );
}

function RenderOtp({ ticketAuth }: { ticketAuth: TicketAuth }) {
  const [value, setValue] = useState("");
  const [wait, setWait] = useState(false);

  const otpAndLink = useMutation(
    orpc.cosmoLink.otpAndLink.mutationOptions({
      onSuccess: () => {
        toast.success("Successfully linked your Cosmo profile");
        setWait(true);
      },
      onError: ({ message }) => {
        toast.error(message || "Error sending OTP");
      },
    }),
  );

  if (otpAndLink.isError)
    return (
      <div className="flex flex-col items-center gap-2">
        <span>{otpAndLink.error.message}</span>
        <Button intent="secondary" onClick={() => otpAndLink.reset()}>
          Try again
        </Button>
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-2">
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
        <Button type="submit" isPending={otpAndLink.isPending || wait}>
          Submit
        </Button>
      </Form>
    </div>
  );
}
