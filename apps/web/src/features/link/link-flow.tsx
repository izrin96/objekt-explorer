import { CheckCircleIcon, DeviceMobileIcon, WarningIcon } from "@phosphor-icons/react";
import type { ValidArtist } from "@repo/cosmo/types/common";
import type { CosmoSearchResult } from "@repo/cosmo/types/user";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ofetch } from "ofetch";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { MessageMarkup } from "@/features/link/message-markup";
import { currentUserOptions } from "@/features/user/queries";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const DEBOUNCE_MS = 350;

type Step = "intro" | "nickname" | "artist" | "verify" | "success";

type Found = { cosmoId: number; nickname: string; address: string };
type Code = { code: string; expiresInMs: number };

function useSteps() {
  return [
    { id: "nickname", label: m.link_enter_nickname() },
    { id: "artist", label: m.link_step_artist() },
    { id: "verify", label: m.link_verify() },
  ] as const;
}

function Stepper({ step }: { step: Step }) {
  const steps = useSteps();
  const index = steps.findIndex((s) => s.id === step);
  const current = step === "success" ? steps.length : index;

  return (
    <ol className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
              i < current && "text-success-foreground bg-success/8 border-transparent",
              i === current && "border-foreground text-foreground font-medium",
              i > current && "text-muted-foreground",
            )}
            aria-current={i === current ? "step" : undefined}
          >
            <span className="font-mono">{i + 1}</span>
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="bg-border h-px w-4" />}
        </li>
      ))}
    </ol>
  );
}

const CARD = "bg-card flex max-w-md flex-col items-start gap-3 rounded-lg border p-5";

export function LinkFlow() {
  const [step, setStep] = useState<Step>("intro");
  const [found, setFound] = useState<Found | null>(null);
  const [artistId, setArtistId] = useState<ValidArtist | null>(null);
  const [code, setCode] = useState<Code | null>(null);

  const startOver = () => {
    setFound(null);
    setArtistId(null);
    setCode(null);
    setStep("nickname");
  };

  return (
    <div className="flex flex-col gap-5">
      {step !== "intro" && <Stepper step={step} />}

      {step === "intro" && (
        <div className={cn(CARD, "max-w-xl")}>
          <DeviceMobileIcon className="size-10" weight="light" />
          <h2 className="font-display text-lg font-semibold">{m.link_process_intro_title()}</h2>
          <p className="text-muted-foreground text-sm text-pretty">
            {m.link_process_intro_description()}
          </p>
          <Button onClick={() => setStep("nickname")}>{m.link_continue()}</Button>
        </div>
      )}

      {step === "nickname" && (
        <NicknameStep
          onFound={(next) => {
            setFound(next);
            setStep("artist");
          }}
        />
      )}

      {step === "artist" && found && (
        <ArtistStep
          found={found}
          onCode={(artist, next) => {
            setArtistId(artist);
            setCode(next);
            setStep("verify");
          }}
          onStartOver={startOver}
        />
      )}

      {step === "verify" && found && artistId && code && (
        <VerifyStep
          key={code.code}
          found={found}
          artistId={artistId}
          code={code}
          onLinked={() => setStep("success")}
          onStartOver={startOver}
        />
      )}

      {step === "success" && found && (
        <div className={CARD}>
          <CheckCircleIcon className="text-success-foreground size-10" weight="fill" />
          <span className="text-sm">{m.link_success({ nickname: found.nickname })}</span>
          <Button
            variant="outline"
            render={<Link to="/@{$nickname}" params={{ nickname: found.nickname }} />}
          >
            {m.link_go_to_cosmo()}
          </Button>
        </div>
      )}
    </div>
  );
}

function NicknameStep({ onFound }: { onFound: (found: Found) => void }) {
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const setDebouncedQuery = useDebouncedCallback(setQuery, DEBOUNCE_MS);
  const trimmed = query.trim();

  const search = useQuery({
    queryKey: ["user-search", trimmed],
    queryFn: () =>
      ofetch<CosmoSearchResult>("/api/user/search", { query: { query: trimmed } }).then(
        (res) => res.results,
      ),
    enabled: trimmed.length > 0,
    retry: false,
  });

  const check = useMutation(orpc.cosmoLink.checkAddress.mutationOptions());

  const pick = (user: { id: number; nickname: string; address: string }) => {
    check.mutate(user.address, {
      onSuccess: () =>
        onFound({ cosmoId: user.id, nickname: user.nickname, address: user.address }),
    });
  };

  const results = search.data ?? [];

  return (
    <div className={cn(CARD, "w-full")}>
      <p className="text-sm">{m.link_process_nickname_step_prompt()}</p>
      <div className="flex w-full flex-col gap-1.5">
        <Label htmlFor="link-nickname">{m.link_enter_nickname()}</Label>
        <Input
          id="link-nickname"
          placeholder={m.link_nickname_placeholder()}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setDebouncedQuery(event.target.value);
          }}
        />
      </div>

      {search.isFetching || check.isPending ? (
        <div className="flex w-full justify-center py-2">
          <Spinner className="size-5" />
        </div>
      ) : results.length > 0 ? (
        <ul className="bg-background w-full divide-y overflow-hidden rounded-md border">
          {results.map((user) => (
            <li key={user.address}>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-none"
                onClick={() => pick(user)}
              >
                {user.nickname}
              </Button>
            </li>
          ))}
        </ul>
      ) : trimmed.length > 0 ? (
        <span className="text-muted-foreground text-sm">{m.link_nickname_not_found()}</span>
      ) : null}

      {check.isError && <StepError message={check.error.message} />}
    </div>
  );
}

function ArtistStep({
  found,
  onCode,
  onStartOver,
}: {
  found: Found;
  onCode: (artistId: ValidArtist, code: Code) => void;
  onStartOver: () => void;
}) {
  const { artists } = useCosmoArtist();
  const generate = useMutation(orpc.cosmoLink.generateCode.mutationOptions());

  return (
    <div className={CARD}>
      <span className="text-sm">
        {m.link_process_artist_step_cosmo_id()}{" "}
        <span className="font-semibold">{found.nickname}</span>
      </span>
      <p className="text-muted-foreground text-sm">{m.link_process_artist_step_select()}</p>
      <div className="flex flex-wrap gap-2">
        {artists.map((artist) => (
          <Button
            key={artist.id}
            variant="outline"
            disabled={generate.isPending}
            loading={generate.isPending && generate.variables?.artistId === artist.id}
            onClick={() =>
              generate.mutate(
                {
                  address: found.address,
                  cosmoId: found.cosmoId,
                  nickname: found.nickname,
                  artistId: artist.id,
                },
                { onSuccess: (code) => onCode(artist.id, code) },
              )
            }
          >
            {artist.title}
          </Button>
        ))}
      </div>

      {generate.isError && <StepError message={generate.error.message} />}

      <Button variant="ghost" size="sm" onClick={onStartOver}>
        {m.link_start_over()}
      </Button>
    </div>
  );
}

function VerifyStep({
  found,
  artistId,
  code,
  onLinked,
  onStartOver,
}: {
  found: Found;
  artistId: ValidArtist;
  code: Code;
  onLinked: () => void;
  onStartOver: () => void;
}) {
  const queryClient = useQueryClient();
  const { getArtist } = useCosmoArtist();
  const artistTitle = getArtist(artistId)?.title ?? artistId;
  const [expired, setExpired] = useState(false);

  const verify = useMutation(
    orpc.cosmoLink.verifyStatusMessage.mutationOptions({
      onSuccess: async () => {
        toastManager.add({ type: "success", title: m.link_success({ nickname: found.nickname }) });
        await queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey });
        onLinked();
      },
    }),
  );

  if (expired) {
    return (
      <div className={CARD}>
        <WarningIcon className="text-warning-foreground size-8" />
        <span className="text-sm">{m.link_code_expired()}</span>
        <Button variant="outline" onClick={onStartOver}>
          {m.link_start_over()}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(CARD, "w-full")}>
      <p className="text-sm">
        <MessageMarkup
          parts={m.link_process_verify_step_verifying.parts()}
          markup={{
            nickname: () => <span className="font-semibold">{found.nickname}</span>,
            artist: () => <span className="font-semibold">{artistTitle}</span>,
          }}
        />
      </p>

      <div className="bg-muted w-full rounded-lg p-4 text-center font-mono text-2xl tracking-widest select-all">
        {code.code}
      </div>

      <p className="text-muted-foreground text-sm text-pretty">
        {m.link_code_instructions({ artist: artistTitle })}
      </p>

      <Countdown expiresInMs={code.expiresInMs} onExpire={() => setExpired(true)} />

      <div className="flex flex-wrap items-center gap-2">
        <Button loading={verify.isPending} onClick={() => verify.mutate(found.address)}>
          {m.link_verify()}
        </Button>
        <Button variant="ghost" size="sm" onClick={onStartOver}>
          {m.link_start_over()}
        </Button>
      </div>

      {verify.isError && (
        <StepError message={verify.error.message || m.link_verification_failed()} />
      )}
    </div>
  );
}

function Countdown({ expiresInMs, onExpire }: { expiresInMs: number; onExpire: () => void }) {
  const [deadline] = useState(() => Date.now() + expiresInMs);
  const [remaining, setRemaining] = useState(expiresInMs);

  useEffect(() => {
    // read the clock rather than decrementing, so a backgrounded tab catches up
    const id = setInterval(() => {
      const next = Math.max(deadline - Date.now(), 0);
      setRemaining(next);
      if (next <= 0) onExpire();
    }, 500);
    return () => clearInterval(id);
  }, [deadline, onExpire]);

  const seconds = Math.ceil(remaining / 1000);
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;

  return (
    <span className="text-muted-foreground font-mono text-xs tabular-nums">
      {m.link_process_countdown_remaining({ countdown })}
    </span>
  );
}

function StepError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="text-warning-foreground bg-warning/8 flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-pretty"
    >
      <WarningIcon className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}
