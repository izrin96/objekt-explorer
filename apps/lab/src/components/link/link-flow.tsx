import { CheckCircleIcon, DeviceMobileIcon, WarningIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { notImplemented } from "@/components/shared/not-implemented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { users } from "@/fixtures/users";
import { cn } from "@/lib/utils";
import { ARTISTS } from "@/store/artists";
import { type CosmoLink, useCosmoLinks } from "@/store/link";

/** only this Cosmo ID resolves, everything else is "not found" */
const KNOWN_NICKNAME = "izrin96";
const CODE_SECONDS = 60;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** deterministic six-character code, so nothing impure runs during render */
function makeCode(attempt: number): string {
  let state = (attempt + 1) * 2654435761;
  let out = "";
  for (let i = 0; i < 6; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    out += CODE_ALPHABET[state % CODE_ALPHABET.length];
  }
  return out;
}

type Step = "intro" | "nickname" | "artist" | "verify" | "success";

const STEPS: { id: Step; label: string }[] = [
  { id: "nickname", label: "Cosmo ID" },
  { id: "artist", label: "Artist" },
  { id: "verify", label: "Verify" },
];

function Stepper({ step }: { step: Step }) {
  const index = STEPS.findIndex((s) => s.id === step);
  const current = step === "success" ? STEPS.length : index;

  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((s, i) => (
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
          {i < STEPS.length - 1 && <span className="bg-border h-px w-4" />}
        </li>
      ))}
    </ol>
  );
}

function Countdown({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds * 1000);

  useEffect(() => {
    const deadline = Date.now() + seconds * 1000;
    const id = setInterval(() => {
      const next = Math.max(deadline - Date.now(), 0);
      setRemaining(next);
      if (next <= 0) onExpire();
    }, 500);
    return () => clearInterval(id);
  }, [seconds, onExpire]);

  const left = Math.ceil(remaining / 1000);
  return (
    <span className="text-muted-foreground font-mono text-xs">
      Remaining {String(Math.floor(left / 60)).padStart(2, "0")}:
      {String(left % 60).padStart(2, "0")}
    </span>
  );
}

/** Port of `components/link/link-process.tsx`, one screen instead of five. */
export function LinkFlow({ onDone }: { onDone: () => void }) {
  const add = useCosmoLinks((s) => s.add);
  const links = useCosmoLinks((s) => s.links);
  const [step, setStep] = useState<Step>("intro");
  const [query, setQuery] = useState("");
  const [problem, setProblem] = useState<"not-found" | "already-linked" | null>(null);
  // only what the verification step knows; `add` fills the settings defaults
  const [found, setFound] = useState<Pick<CosmoLink, "nickname" | "address"> | null>(null);
  const [artist, setArtist] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<"idle" | "verifying" | "expired">("idle");

  const startOver = () => {
    setStep("nickname");
    setQuery("");
    setProblem(null);
    setFound(null);
    setArtist(null);
    setPhase("idle");
  };

  const verify = () => {
    const nickname = query.trim();
    if (nickname.toLowerCase() !== KNOWN_NICKNAME) {
      setProblem("not-found");
      return;
    }
    const user = users.find((u) => u.nickname === KNOWN_NICKNAME);
    // `izrin96` is seeded, so this is the path the flow takes on a second run
    if (links.some((l) => l.address === user?.address)) {
      setProblem("already-linked");
      return;
    }
    setProblem(null);
    setFound({ nickname: KNOWN_NICKNAME, address: user?.address ?? "0x0" });
    setStep("artist");
  };

  const pickArtist = (value: string) => {
    setArtist(value);
    setAttempt((n) => n + 1);
    setPhase("idle");
    setStep("verify");
  };

  const runVerification = () => {
    setPhase("verifying");
    setTimeout(() => {
      if (!found) return;
      add(found);
      setPhase("idle");
      setStep("success");
      toastManager.add({ type: "success", title: `Cosmo ${found.nickname} linked` });
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-5">
      {step !== "intro" && <Stepper step={step} />}

      {step === "intro" && (
        <div className="bg-card flex max-w-xl flex-col items-start gap-3 rounded-lg border p-5">
          <DeviceMobileIcon className="size-10" weight="light" />
          <h2 className="font-display text-lg font-semibold">Link your Cosmo profile</h2>
          <p className="text-muted-foreground text-sm">
            You need to download the Cosmo app and sign in with the Cosmo ID you want to link before
            you continue.
          </p>
          <Button onClick={() => setStep("nickname")}>Continue</Button>
        </div>
      )}

      {step === "nickname" && (
        <div className="bg-card flex max-w-md flex-col gap-3 rounded-lg border p-5">
          <p className="text-sm">Search your Cosmo ID to get started.</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-nickname">Cosmo ID</Label>
            <div className="flex items-center gap-2">
              <Input
                id="link-nickname"
                placeholder="Your Cosmo ID"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setProblem(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    verify();
                  }
                }}
              />
              <Button onClick={verify} disabled={query.trim().length === 0}>
                Verify
              </Button>
            </div>
          </div>
          {problem !== null && (
            <p className="text-warning-foreground bg-warning/8 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs">
              <WarningIcon />
              {problem === "not-found" ? "Cosmo ID not found" : "Cosmo ID already linked"}
            </p>
          )}
        </div>
      )}

      {step === "artist" && found && (
        <div className="bg-card flex max-w-md flex-col gap-3 rounded-lg border p-5">
          <span className="text-sm">
            Cosmo ID: <span className="font-semibold">{found.nickname}</span>
          </span>
          <p className="text-muted-foreground text-sm">
            Select the artist profile to use for verification.
          </p>
          <div className="flex flex-wrap gap-2">
            {ARTISTS.map((a) => (
              <Button key={a} variant="outline" onClick={() => pickArtist(a)}>
                {a}
              </Button>
            ))}
          </div>
          <div className="flex">
            <Button variant="ghost" size="sm" onClick={startOver}>
              Start over
            </Button>
          </div>
        </div>
      )}

      {step === "verify" && found && artist && (
        <div className="bg-card flex max-w-md flex-col items-start gap-3 rounded-lg border p-5">
          {phase === "expired" ? (
            <>
              <WarningIcon className="text-warning-foreground size-8" />
              <span className="text-sm">Code expired · Try again</span>
              <Button variant="outline" onClick={startOver}>
                Start over
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm">
                Verifying <span className="font-semibold">{found.nickname}</span> on{" "}
                <span className="font-semibold">{artist}</span> Cosmo profile
              </p>
              <div className="bg-muted w-full rounded-lg p-4 text-center font-mono text-2xl tracking-widest select-all">
                {makeCode(attempt)}
              </div>
              <p className="text-muted-foreground text-sm">
                Add this code to your {artist} Cosmo profile bio, then verify below.
              </p>
              <Countdown
                key={attempt}
                seconds={CODE_SECONDS}
                onExpire={() => setPhase("expired")}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    notImplemented({ title: "Opening Cosmo", description: "Fake deep link" })
                  }
                >
                  Go to Cosmo
                </Button>
                <Button onClick={runVerification} loading={phase === "verifying"}>
                  Verify
                </Button>
                {phase === "verifying" && <Spinner className="size-4" />}
                <Button variant="ghost" size="sm" onClick={startOver}>
                  Start over
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {step === "success" && found && (
        <div className="bg-card flex max-w-md flex-col items-start gap-3 rounded-lg border p-5">
          <CheckCircleIcon className="text-success-foreground size-10" weight="fill" />
          <span className="text-sm">
            Success. Cosmo <span className="font-semibold">{found.nickname}</span> linked.
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              render={<Link to="/profile/$nickname" params={{ nickname: found.nickname }} />}
            >
              Go to your Cosmo
            </Button>
            <Button onClick={onDone}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}
