"use client";

import type { ValidArtist } from "@repo/cosmo/types/common";
import type { CosmoPublicUser, CosmoSearchResult } from "@repo/cosmo/types/user";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { ofetch } from "ofetch";
import { useState } from "react";
import type { Selection } from "react-aria-components";
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
  const [step, setStep] = useState(0);
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [artistId, setArtistId] = useState<ValidArtist | null>(null);
  const [codeData, setCodeData] = useState<CodeData | null>(null);

  return (
    <div className="flex flex-col items-center justify-center gap-5">
      {step === 0 && <IntroStep onContinue={() => setStep(1)} />}
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

function IntroStep({ onContinue }: { onContinue: () => void }) {
  const content = useIntlayer("link");
  return (
    <div className="flex max-w-xl flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-semibold">{content.process.intro_title.value}</h2>
      <img
        src="/assets/icon-smartphone.png"
        alt="Smartphone"
        width={220}
        height={220}
        className="fade-in zoom-in animate-in duration-200"
      />
      <div className="flex flex-col gap-2 text-center text-sm">
        <span>{content.process.intro_description.value}</span>
      </div>
      <Button size="md" intent="outline" onPress={onContinue}>
        {content.continue.value}
      </Button>
    </div>
  );
}

function NicknameStep({ onSuccess }: { onSuccess: (data: SearchData) => void }) {
  const content = useIntlayer("link");
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
      <img
        src="/assets/icon-search.png"
        alt="Search"
        width={220}
        height={220}
        className="fade-in zoom-in animate-in duration-200"
      />
      <span className="text-center">{content.process.nickname_step_prompt.value}</span>
      <SearchField
        value={inputValue}
        onChange={setInputValue}
        aria-label={content.enter_nickname.value}
        className="w-full"
      >
        <SearchInput placeholder={content.nickname_placeholder.value} />
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
          aria-label={content.enter_nickname.value}
          className="w-full"
        >
          {(item: CosmoPublicUser) => (
            <ListBoxItem id={item.address} textValue={item.nickname}>
              <ListBoxLabel>{item.nickname}</ListBoxLabel>
            </ListBoxItem>
          )}
        </ListBox>
      ) : debouncedQuery.length > 0 && data ? (
        <p className="text-muted-fg text-center text-sm">{content.nickname_not_found.value}</p>
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
  const content = useIntlayer("link");
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
      <img
        src="/assets/icon-lanyard.png"
        alt="Verify"
        width={220}
        height={220}
        className="fade-in zoom-in animate-in duration-200"
      />
      <span>
        {content.process.artist_step_cosmo_id.value}{" "}
        <span className="font-bold">{searchData.nickname}</span>
      </span>
      <p className="text-center text-sm">{content.process.artist_step_select.value}</p>
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
        {content.start_over.value}
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
  const content = useIntlayer("link");
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
        toast.success(content.success({ nickname: searchData.nickname }).value);
        onSuccess();
      },
      onError: ({ message }) => {
        toast.error(message || content.verification_failed.value);
      },
    }),
  );

  if (expired) {
    return (
      <div className="flex flex-col items-center gap-2">
        <img
          src="/assets/icon-trash.png"
          alt="Expired"
          width={220}
          height={220}
          className="fade-in zoom-in animate-in duration-200"
        />
        <span>{content.code_expired.value}</span>
        <Button intent="outline" onPress={onStartOver}>
          {content.start_over.value}
        </Button>
      </div>
    );
  }

  if (verifyMutation.isError) {
    return (
      <div className="flex flex-col items-center gap-2">
        <img
          src="/assets/icon-error.png"
          alt="Error"
          width={220}
          height={220}
          className="fade-in zoom-in animate-in duration-200"
        />
        <span>{verifyMutation.error.message}</span>
        <div className="flex gap-2">
          <Button intent="primary" onPress={() => verifyMutation.reset()}>
            {content.try_again.value}
          </Button>
          <Button intent="outline" onPress={onStartOver}>
            {content.start_over.value}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src={randomIcon.src}
        alt={randomIcon.alt}
        width={220}
        height={220}
        className="fade-in zoom-in animate-in duration-200"
      />
      <span>
        {content.process.verify_step_verifying.use({
          nickname: () => <span className="font-bold">{searchData.nickname}</span>,
          artist: () => <span className="font-bold">{artistTitle}</span>,
        })}
      </span>

      <div className="bg-muted rounded-lg p-4 text-center font-mono text-2xl tracking-widest select-all">
        {codeData.code}
      </div>

      <p className="max-w-md text-center text-sm">
        {content.code_instructions({ artist: artistTitle }).value}
      </p>

      <Countdown deadline={deadline} onExpire={() => setExpired(true)} />

      <Button
        onPress={() => verifyMutation.mutate(searchData.address)}
        isPending={verifyMutation.isPending}
      >
        {verifyMutation.isPending ? <Loader variant="ring" /> : content.verify.value}
      </Button>

      <Button intent="outline" onPress={onStartOver}>
        {content.start_over.value}
      </Button>
    </div>
  );
}

function SuccessStep({ nickname }: { nickname: string }) {
  const content = useIntlayer("link");

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src="/assets/icon-welcome.png"
        width={220}
        height={220}
        alt="Welcome"
        className="fade-in zoom-in animate-in duration-200"
      />
      <span>{content.success({ nickname }).value}</span>
      <div>
        <Link
          className={buttonStyles({
            intent: "outline",
          })}
          href={`/@${nickname}`}
        >
          {content.go_to_cosmo.value}
        </Link>
      </div>
    </div>
  );
}

function Countdown({ deadline, onExpire }: { deadline: number; onExpire: () => void }) {
  const content = useIntlayer("link");
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

  return (
    <span className="text-sm">
      {content.process.countdown_remaining({ countdown: msToCountdown(remaining) }).value}
    </span>
  );
}
