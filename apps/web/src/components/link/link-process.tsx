"use client";

import type { ValidArtist } from "@repo/cosmo/types/common";
import type { CosmoPublicUser, CosmoSearchResult } from "@repo/cosmo/types/user";
import type { Selection } from "react-aria-components";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { ofetch } from "ofetch";
import { useState } from "react";
import { toast } from "sonner";
import { useDebounceValue, useInterval } from "usehooks-ts";

import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { orpc } from "@/lib/orpc/client";
import { getBaseURL, msToCountdown } from "@/lib/utils";

import { Button, buttonStyles } from "../ui/button";
import { Link } from "../ui/link";
import { ListBox, ListBoxItem, ListBoxLabel } from "../ui/list-box";
import { Loader } from "../ui/loader";
import { SearchField, SearchInput } from "../ui/search-field";

type SearchData = {
  cosmoId: number;
  nickname: string;
  address: string;
};

type CodeData = {
  code: string;
  expiresInMs: number;
};

export default function LinkRender() {
  const queryClient = useQueryClient();
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [artistId, setArtistId] = useState<ValidArtist | null>(null);
  const [codeData, setCodeData] = useState<CodeData | null>(null);

  return (
    <div className="flex flex-col items-center justify-center gap-5">
      {step === 0 && <IntroStep locale={locale} onContinue={() => setStep(1)} />}
      {step === 1 && (
        <NicknameStep
          onSuccess={(data) => {
            setSearchData(data);
            setStep(2);
          }}
        />
      )}
      {step === 2 && searchData && (
        <ArtistStep
          searchData={searchData}
          onSuccess={(selectedArtist, code) => {
            setArtistId(selectedArtist);
            setCodeData(code);
            setStep(3);
          }}
          onBack={() => {
            setSearchData(null);
            setStep(1);
          }}
        />
      )}
      {step === 3 && searchData && artistId && codeData && (
        <VerifyStep
          searchData={searchData}
          artistId={artistId}
          codeData={codeData}
          onSuccess={() => {
            void queryClient.invalidateQueries({
              queryKey: orpc.profile.list.key(),
            });
            setStep(4);
          }}
          onStartOver={() => {
            setSearchData(null);
            setArtistId(null);
            setCodeData(null);
            setStep(1);
          }}
        />
      )}
      {step === 4 && searchData && <SuccessStep nickname={searchData.nickname} />}
    </div>
  );
}

function IntroStep({ locale, onContinue }: { locale: string; onContinue: () => void }) {
  return (
    <div className="flex max-w-xl flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-semibold">
        {locale === "en" && "Link your Cosmo profile"}
        {locale === "ko" && "Cosmo 프로필을 연결하세요"}
      </h2>
      <Image
        src="/assets/icon-smartphone.png"
        alt="Smartphone"
        width={220}
        height={220}
        className="fade-in zoom-in animate-in duration-200"
      />
      {locale === "en" && (
        <div className="flex flex-col gap-2 text-center text-sm">
          You need to download the Cosmo app and sign in with the Cosmo ID you want to link before
          continue.
        </div>
      )}
      {locale === "ko" && (
        <div className="flex flex-col gap-2">
          <p>계속 진행하기 전에 Cosmo 앱을 다운로드하고 연결하려는 Cosmo ID로 로그인해야 합니다.</p>
        </div>
      )}
      <Button size="md" intent="outline" onPress={onContinue}>
        {locale === "ko" ? "계속하기" : "Continue"}
      </Button>
    </div>
  );
}

function NicknameStep({ onSuccess }: { onSuccess: (data: SearchData) => void }) {
  const t = useTranslations("link");
  const locale = useLocale();
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery] = useDebounceValue(inputValue, 350);

  const { data, isPending } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: () => {
      const url = new URL("/api/user/search", getBaseURL());
      return ofetch<CosmoSearchResult>(url.toString(), {
        query: { query: debouncedQuery },
      }).then((res) => res.results);
    },
    enabled: debouncedQuery.length > 0,
  });

  const checkMutation = useMutation(
    orpc.cosmoLink.checkAddress.mutationOptions({
      onError: ({ message }) => {
        toast.error(message);
      },
    }),
  );

  const handleSelection = (keys: Selection) => {
    if (keys === "all" || !data) return;
    const key = [...keys][0];
    if (!key) return;
    const user = data.find((u) => u.address === key);
    if (user) {
      checkMutation.mutate(user.address, {
        onSuccess: () => {
          onSuccess({
            cosmoId: user.id,
            nickname: user.nickname,
            address: user.address,
          });
        },
      });
    }
  };

  return (
    <div className="flex max-w-md flex-col items-center gap-4">
      <Image
        src="/assets/icon-search.png"
        alt="Search"
        width={220}
        height={220}
        className="fade-in zoom-in animate-in duration-200"
      />
      <span className="text-center">
        {locale === "en" && "Search your Cosmo ID to get started."}
        {locale === "ko" && "시작하려면 Cosmo ID를 검색하세요."}
      </span>
      <SearchField
        value={inputValue}
        onChange={setInputValue}
        aria-label={t("enter_nickname")}
        className="w-full"
      >
        <SearchInput placeholder={t("nickname_placeholder")} />
      </SearchField>
      {(isPending && debouncedQuery.length > 0) || checkMutation.isPending ? (
        <div className="flex justify-center p-4">
          <Loader variant="ring" />
        </div>
      ) : data && data.length > 0 ? (
        <ListBox
          items={data}
          selectionMode="single"
          onSelectionChange={handleSelection}
          aria-label={t("enter_nickname")}
          className="w-full"
        >
          {(item: CosmoPublicUser) => (
            <ListBoxItem id={item.address} textValue={item.nickname}>
              <ListBoxLabel>{item.nickname}</ListBoxLabel>
            </ListBoxItem>
          )}
        </ListBox>
      ) : debouncedQuery.length > 0 && data ? (
        <p className="text-muted-fg text-center text-sm">{t("nickname_not_found")}</p>
      ) : null}
    </div>
  );
}

function ArtistStep({
  searchData,
  onSuccess,
  onBack,
}: {
  searchData: SearchData;
  onSuccess: (artistId: ValidArtist, codeData: CodeData) => void;
  onBack: () => void;
}) {
  const t = useTranslations("link");
  const locale = useLocale();
  const { artists } = useCosmoArtist();

  const generateMutation = useMutation(
    orpc.cosmoLink.generateCode.mutationOptions({
      onError: ({ message }) => {
        toast.error(message);
      },
    }),
  );

  const handleSelect = (artistId: ValidArtist) => {
    generateMutation.mutate(
      {
        address: searchData.address,
        cosmoId: searchData.cosmoId,
        nickname: searchData.nickname,
        artistId,
      },
      {
        onSuccess: (data) => {
          onSuccess(artistId, data);
        },
      },
    );
  };

  return (
    <div className="flex max-w-md flex-col items-center gap-4">
      <Image
        src="/assets/icon-lanyard.png"
        alt="Verify"
        width={220}
        height={220}
        className="fade-in zoom-in animate-in duration-200"
      />
      <span>
        {locale === "en" && (
          <>
            Cosmo ID: <span className="font-bold">{searchData.nickname}</span>
          </>
        )}
        {locale === "ko" && (
          <>
            Cosmo ID: <span className="font-bold">{searchData.nickname}</span>
          </>
        )}
      </span>
      <p className="text-center text-sm">
        {locale === "en" && "Select the artist profile to use for verification."}
        {locale === "ko" && "인증에 사용할 아티스트 프로필을 선택하세요."}
      </p>
      <div className="flex gap-2">
        {artists.map((artist) => (
          <Button
            key={artist.id}
            intent="outline"
            isPending={
              generateMutation.isPending && generateMutation.variables?.artistId === artist.id
            }
            isDisabled={generateMutation.isPending}
            onPress={() => handleSelect(artist.id)}
          >
            {artist.title}
          </Button>
        ))}
      </div>
      <Button intent="outline" onPress={onBack}>
        {t("start_over")}
      </Button>
    </div>
  );
}

function VerifyStep({
  searchData,
  artistId,
  codeData,
  onSuccess,
  onStartOver,
}: {
  searchData: SearchData;
  artistId: ValidArtist;
  codeData: CodeData;
  onSuccess: () => void;
  onStartOver: () => void;
}) {
  const t = useTranslations("link");
  const locale = useLocale();
  const { getArtist } = useCosmoArtist();
  const artistTitle = getArtist(artistId)?.title ?? artistId;

  const [randomIcon] = useState(() => {
    const icons = [
      { src: "/assets/icon-axolotl.png", alt: "Axolotl" },
      { src: "/assets/icon-deer.png", alt: "Deer" },
      { src: "/assets/icon-panda.png", alt: "Panda" },
      { src: "/assets/icon-squirrel.png", alt: "Squirrel" },
      { src: "/assets/icon-bear.png", alt: "Bear" },
      { src: "/assets/icon-cat.png", alt: "Cat" },
      { src: "/assets/icon-giraffe.png", alt: "Giraffe" },
      { src: "/assets/icon-white-fox.png", alt: "White Fox" },
    ];
    return icons[Math.floor(Math.random() * icons.length)]!;
  });

  const [deadline] = useState(() => Date.now() + codeData.expiresInMs);
  const [expired, setExpired] = useState(false);

  const verifyMutation = useMutation(
    orpc.cosmoLink.verifyStatusMessage.mutationOptions({
      onSuccess: () => {
        toast.success(t("success", { nickname: searchData.nickname }));
        onSuccess();
      },
      onError: ({ message }) => {
        toast.error(message || t("verification_failed"));
      },
    }),
  );

  if (expired) {
    return (
      <div className="flex flex-col items-center gap-2">
        <Image
          src="/assets/icon-trash.png"
          alt="Expired"
          width={220}
          height={220}
          className="fade-in zoom-in animate-in duration-200"
        />
        <span>{t("code_expired")}</span>
        <Button intent="outline" onPress={onStartOver}>
          {t("start_over")}
        </Button>
      </div>
    );
  }

  if (verifyMutation.isError) {
    return (
      <div className="flex flex-col items-center gap-2">
        <Image
          src="/assets/icon-error.png"
          alt="Error"
          width={220}
          height={220}
          className="fade-in zoom-in animate-in duration-200"
        />
        <span>{verifyMutation.error.message}</span>
        <div className="flex gap-2">
          <Button intent="primary" onPress={() => verifyMutation.reset()}>
            {t("try_again")}
          </Button>
          <Button intent="outline" onPress={onStartOver}>
            {t("start_over")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Image
        src={randomIcon.src}
        alt={randomIcon.alt}
        width={220}
        height={220}
        className="fade-in zoom-in animate-in duration-200"
      />
      <span>
        {locale === "en" && (
          <>
            Verifying <span className="font-bold">{searchData.nickname}</span> on{" "}
            <span className="font-bold">{artistTitle}</span> Cosmo profile
          </>
        )}
        {locale === "ko" && (
          <>
            <span className="font-bold">{artistTitle}</span> Cosmo 프로필에서{" "}
            <span className="font-bold">{searchData.nickname}</span> 인증 중
          </>
        )}
      </span>

      <div className="bg-muted rounded-lg p-4 text-center font-mono text-2xl tracking-widest select-all">
        {codeData.code}
      </div>

      <p className="max-w-md text-center text-sm">
        {t("code_instructions", { artist: artistTitle })}
      </p>

      <Countdown deadline={deadline} onExpire={() => setExpired(true)} />

      <Button
        onPress={() => verifyMutation.mutate(searchData.address)}
        isPending={verifyMutation.isPending}
      >
        {verifyMutation.isPending ? <Loader variant="ring" /> : t("verify")}
      </Button>

      <Button intent="outline" onPress={onStartOver}>
        {t("start_over")}
      </Button>
    </div>
  );
}

function SuccessStep({ nickname }: { nickname: string }) {
  const t = useTranslations("link");

  return (
    <div className="flex flex-col items-center gap-2">
      <Image
        src="/assets/icon-welcome.png"
        width={220}
        height={220}
        alt="Welcome"
        className="fade-in zoom-in animate-in duration-200"
      />
      <span>{t("success", { nickname })}</span>
      <div>
        <Link
          className={buttonStyles({
            intent: "outline",
          })}
          href={`/@${nickname}`}
        >
          {t("go_to_cosmo")}
        </Link>
      </div>
    </div>
  );
}

function Countdown({ deadline, onExpire }: { deadline: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(() => Math.max(deadline - Date.now(), 0));

  useInterval(
    () => {
      const next = Math.max(deadline - Date.now(), 0);
      setRemaining(next);
      if (next <= 0) {
        onExpire();
      }
    },
    remaining > 0 ? 1000 : null,
  );

  return <span className="text-sm">Remaining {msToCountdown(remaining)}</span>;
}
