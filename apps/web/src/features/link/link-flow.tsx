import { isDefinedError } from "@orpc/client";
import {
  CheckCircleIcon,
  CheckIcon,
  DeviceMobileIcon,
  MagnifyingGlassIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { ValidArtist } from "@repo/cosmo/types/common";
import type { CosmoPublicUser } from "@repo/cosmo/types/user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxList } from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { ArtistAvatar } from "@/features/artist/artist-avatar";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { PROFILE_PAGE_KEY } from "@/features/profile/queries";
import { currentUserOptions } from "@/features/user/queries";
import {
  UserRowBody,
  UserSearchEmpty,
  UserSearchItem,
  useUserSearch,
} from "@/features/user/user-search";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const STEPS = ["nickname", "artist", "verify"] as const;
const MAX_NICKNAME_RESULTS = 5;

type StepId = (typeof STEPS)[number];
type Step = StepId | "success";

type Code = { code: string; expiresInMs: number };

function hasProfile(found: CosmoPublicUser, artistId: ValidArtist) {
  return found.userProfiles.some((p) => p.artistId.toLowerCase() === artistId.toLowerCase());
}

function codeInput(found: CosmoPublicUser, artistId: ValidArtist) {
  return {
    address: found.address,
    cosmoId: found.id,
    nickname: found.nickname,
    artistId,
  };
}

export function LinkFlow() {
  const [step, setStep] = useState<Step>("nickname");
  const [found, setFound] = useState<CosmoPublicUser | null>(null);
  const [artistId, setArtistId] = useState<ValidArtist | null>(null);
  const [code, setCode] = useState<Code | null>(null);
  const { getArtist } = useCosmoArtist();

  if (step === "success" && found) {
    return (
      <div className="bg-card flex w-full flex-col items-start gap-3 rounded-lg border p-5">
        <CheckCircleIcon className="text-success-foreground size-10" weight="fill" />
        <p className="text-sm text-pretty">{m.link_success({ nickname: found.nickname })}</p>
        <Button
          variant="outline"
          render={<Link to="/@{$nickname}" params={{ nickname: found.nickname }} />}
        >
          {m.link_go_to_cosmo()}
        </Button>
      </div>
    );
  }

  // the picked ID stays, so going back reopens the search on it
  const changeCosmo = () => {
    setArtistId(null);
    setCode(null);
    setStep("nickname");
  };

  const changeArtist = () => {
    setCode(null);
    setStep("artist");
  };

  const artist = artistId ? getArtist(artistId) : undefined;
  const artistTitle = artist?.title ?? artistId ?? "";

  return (
    <div className="bg-card w-full rounded-lg border">
      <p className="text-muted-foreground flex items-start gap-2.5 border-b p-4 text-sm text-pretty">
        <DeviceMobileIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        {m.link_process_intro_description()}
      </p>
      <ol className="divide-y">
        <LinkStep
          id="nickname"
          step={step}
          title={m.link_enter_nickname()}
          summary={found && <UserRowBody user={found} />}
          onChange={changeCosmo}
        >
          <NicknameStep
            initialQuery={found?.nickname}
            onFound={(next) => {
              setFound(next);
              setArtistId(null);
              setStep("artist");
            }}
          />
        </LinkStep>

        <LinkStep
          id="artist"
          step={step}
          title={m.link_step_artist()}
          summary={
            artistId && (
              <span className="flex min-w-0 items-center gap-2.5">
                {artist && <ArtistAvatar artist={artist} className="size-6.5 ring-0" />}
                <span className="truncate font-semibold">{artistTitle}</span>
              </span>
            )
          }
          onChange={changeArtist}
        >
          {found && (
            <ArtistStep
              found={found}
              onCode={(artist, next) => {
                setArtistId(artist);
                setCode(next);
                setStep("verify");
              }}
            />
          )}
        </LinkStep>

        <LinkStep id="verify" step={step} title={m.link_verify()}>
          {found && artistId && code && (
            <VerifyStep
              key={code.code}
              found={found}
              artistId={artistId}
              artistTitle={artistTitle}
              code={code}
              onCode={setCode}
              onLinked={() => setStep("success")}
            />
          )}
        </LinkStep>
      </ol>
    </div>
  );
}

/** a done step shows what was picked and a way back to it; only the current one shows its body */
function LinkStep({
  id,
  step,
  title,
  summary,
  onChange,
  children,
}: {
  id: StepId;
  step: Step;
  title: string;
  summary?: ReactNode;
  onChange?: () => void;
  children: ReactNode;
}) {
  const index = STEPS.indexOf(id);
  const current = step === "success" ? STEPS.length : STEPS.indexOf(step);
  const status = index < current ? "done" : index === current ? "current" : "upcoming";

  return (
    <li
      className="flex flex-col gap-3 p-4"
      aria-current={status === "current" ? "step" : undefined}
    >
      <div className="flex min-h-7 items-center gap-3">
        <span
          className={cn(
            "grid size-6 flex-none place-items-center rounded-full border font-mono text-xs tabular-nums",
            status === "done" && "bg-success/8 text-success-foreground border-transparent",
            status === "current" && "border-foreground text-foreground font-medium",
            status === "upcoming" && "text-muted-foreground",
          )}
        >
          {status === "done" ? <CheckIcon className="size-3.5" weight="bold" /> : index + 1}
        </span>
        <h2
          className={cn(
            "flex-1 text-sm font-medium text-balance",
            status === "upcoming" && "text-muted-foreground",
          )}
        >
          {title}
        </h2>
        {status === "done" && onChange && (
          <Button variant="ghost" size="sm" onClick={onChange}>
            {m.link_change()}
          </Button>
        )}
      </div>
      {status === "done" && summary && <div className="ps-9 text-sm">{summary}</div>}
      {status === "current" && <div className="ps-9 max-sm:ps-0">{children}</div>}
    </li>
  );
}

function NicknameStep({
  initialQuery,
  onFound,
}: {
  initialQuery: string | undefined;
  onFound: (found: CosmoPublicUser) => void;
}) {
  const search = useUserSearch(initialQuery);
  const { query, serverError, searching } = search;
  const check = useMutation(orpc.cosmoLink.checkAddress.mutationOptions());

  // the search fans out on a prefix, and only the first few can be the user's own;
  // a user our cache holds without a Cosmo ID (id 0) could never verify
  const results = (search.results ?? [])
    .filter((user) => user.id > 0)
    .slice(0, MAX_NICKNAME_RESULTS);

  const pick = (user: CosmoPublicUser | null) => {
    if (!user || check.isPending) return;
    check.mutate(user.address, { onSuccess: () => onFound(user) });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm text-pretty">
        {m.link_process_nickname_step_prompt()}
      </p>

      <Combobox<CosmoPublicUser>
        inline
        open
        filter={null}
        items={results}
        value={null}
        onValueChange={pick}
        inputValue={query}
        onInputValueChange={(next) => {
          search.setQuery(next);
          // an "already linked" belongs to the pick, not to the next search
          check.reset();
        }}
        itemToStringLabel={(user) => user.nickname}
        autoHighlight
      >
        <ComboboxInput
          autoFocus
          aria-label={m.link_enter_nickname()}
          showTrigger={false}
          placeholder={m.link_nickname_placeholder()}
          startAddon={<MagnifyingGlassIcon />}
          className="w-full"
        />
        {query.trim() !== "" && (
          <div className="bg-background mt-2 overflow-hidden rounded-lg border">
            <ComboboxEmpty className="text-muted-foreground text-center">
              <UserSearchEmpty
                searching={searching}
                serverError={serverError}
                notFound={{
                  title: m.link_nickname_not_found(),
                  hint: m.link_nickname_not_found_hint(),
                }}
              />
            </ComboboxEmpty>
            <ComboboxList className="max-h-72">
              {(user: CosmoPublicUser) => (
                <UserSearchItem key={user.address} value={user}>
                  <span className="flex items-center justify-between gap-2">
                    <UserRowBody user={user} />
                    {check.isPending && check.variables === user.address && (
                      <Spinner className="size-4 flex-none" />
                    )}
                  </span>
                </UserSearchItem>
              )}
            </ComboboxList>
          </div>
        )}
      </Combobox>

      {check.isError && <StepError message={check.error.message} />}
    </div>
  );
}

function ArtistStep({
  found,
  onCode,
}: {
  found: CosmoPublicUser;
  onCode: (artistId: ValidArtist, code: Code) => void;
}) {
  const { artists } = useCosmoArtist();
  const generate = useMutation(orpc.cosmoLink.generateCode.mutationOptions());

  // the Cosmo search lists an ID's artist profiles only some of the time, and
  // our cache fallback never does; without them every artist is offered
  const onProfile = artists.filter((artist) => hasProfile(found, artist.id));
  const options = onProfile.length > 0 ? onProfile : artists;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm text-pretty">
        {m.link_process_artist_step_select()}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((artist) => (
          <Button
            key={artist.id}
            variant="outline"
            disabled={generate.isPending}
            loading={generate.isPending && generate.variables?.artistId === artist.id}
            onClick={() =>
              generate.mutate(codeInput(found, artist.id), {
                onSuccess: (code) => onCode(artist.id, code),
              })
            }
          >
            <ArtistAvatar artist={artist} className="ring-0" />
            {artist.title}
          </Button>
        ))}
      </div>

      {generate.isError && <StepError message={generate.error.message} />}
    </div>
  );
}

function VerifyStep({
  found,
  artistId,
  artistTitle,
  code,
  onCode,
  onLinked,
}: {
  found: CosmoPublicUser;
  artistId: ValidArtist;
  artistTitle: string;
  code: Code;
  onCode: (code: Code) => void;
  onLinked: () => void;
}) {
  const queryClient = useQueryClient();
  const [expired, setExpired] = useState(false);
  const renew = useMutation(orpc.cosmoLink.generateCode.mutationOptions());

  const verify = useMutation(
    orpc.cosmoLink.verifyStatusMessage.mutationOptions({
      // the server's TTL starts before the countdown does, so it can run out first
      onError: (error) => {
        if (isDefinedError(error) && error.code === "VERIFICATION_EXPIRED") setExpired(true);
      },
      onSuccess: async () => {
        toastManager.add({ type: "success", title: m.link_success({ nickname: found.nickname }) });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: PROFILE_PAGE_KEY }),
        ]);
        onLinked();
      },
    }),
  );

  if (expired) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-warning-foreground flex items-start gap-1.5 text-sm text-pretty">
          <WarningIcon className="mt-0.5 shrink-0" aria-hidden />
          {m.link_code_expired()}
        </p>
        <Button
          variant="outline"
          loading={renew.isPending}
          onClick={() => renew.mutate(codeInput(found, artistId), { onSuccess: onCode })}
        >
          {m.link_new_code()}
        </Button>
        {renew.isError && <StepError message={renew.error.message} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm text-pretty">
        {m.link_code_instructions({ artist: artistTitle })}
      </p>

      <div className="bg-muted w-full rounded-lg p-4 text-center font-mono text-2xl tracking-widest select-all">
        {code.code}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button loading={verify.isPending} onClick={() => verify.mutate(found.address)}>
          {m.link_verify()}
        </Button>
        <Countdown expiresInMs={code.expiresInMs} onExpire={() => setExpired(true)} />
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
