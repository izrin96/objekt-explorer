import { CheckCircleIcon, CheckIcon, DeviceMobileIcon } from "@phosphor-icons/react";
import type { ValidArtist } from "@repo/cosmo/types/common";
import type { CosmoPublicUser } from "@repo/cosmo/types/user";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { ArtistAvatar } from "@/features/artist/artist-avatar";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import type { Code } from "@/features/link/link-flow-rules";
import { ArtistStep } from "@/features/link/steps/artist-step";
import { NicknameStep } from "@/features/link/steps/nickname-step";
import { VerifyStep } from "@/features/link/steps/verify-step";
import { UserRowBody } from "@/features/user/user-search";
import { toneChip } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const STEPS = ["nickname", "artist", "verify"] as const;

type StepId = (typeof STEPS)[number];
type Step = StepId | "success";

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
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            render={<Link to="/@{$nickname}" params={{ nickname: found.nickname }} />}
          >
            {m.link_go_to_cosmo()}
          </Button>
          <Button variant="ghost" render={<Link to="/account/profiles" />}>
            {m.account_section_profiles()}
          </Button>
        </div>
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
            "grid size-6 flex-none place-items-center rounded-full border text-xs",
            status === "done" && toneChip("success"),
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
