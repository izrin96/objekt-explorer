import { isDefinedError } from "@orpc/client";
import { WarningIcon } from "@phosphor-icons/react";
import type { ValidArtist } from "@repo/cosmo/types/common";
import type { CosmoPublicUser } from "@repo/cosmo/types/user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { type Code, codeInput } from "@/features/link/link-flow-rules";
import { invalidateLinkChange } from "@/features/link/queries";
import { StepError } from "@/features/link/steps/step-error";
import { orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

export function VerifyStep({
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
        await invalidateLinkChange(queryClient);
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
        {renew.isError && <StepError message={refusalText(renew.error)} />}
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

      {verify.isError && <StepError message={refusalText(verify.error)} />}
    </div>
  );
}

function Countdown({ expiresInMs, onExpire }: { expiresInMs: number; onExpire: () => void }) {
  const [deadline] = useState(() => Date.now() + expiresInMs);
  const [remaining, setRemaining] = useState(expiresInMs);
  const expire = useEffectEvent(onExpire);

  useEffect(() => {
    // read the clock rather than decrementing, so a backgrounded tab catches up
    const id = setInterval(() => {
      const next = Math.max(deadline - Date.now(), 0);
      setRemaining(next);
      if (next <= 0) expire();
    }, 500);
    return () => clearInterval(id);
  }, [deadline]);

  const seconds = Math.ceil(remaining / 1000);
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;

  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      {m.link_process_countdown_remaining({ countdown })}
    </span>
  );
}
