import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { orpc } from "@/lib/orpc";
import { errorReason } from "@/lib/orpc-error";

import {
  clockTick,
  connected,
  type FlowState,
  isPolling,
  minting,
  pollRefused,
  pollResult,
  refused,
  started,
  submitting,
} from "./connect-flow";
import { cosmoSessionsOptions, QR_POLL_MS } from "./queries";

/**
 * The connect dialog's state: opening starts a sign-in, the status check runs only while the
 * dialog waits for a scan or the code, and closing stops it. The ticket (the QR value) stays in
 * this state and is never logged or put in a query key.
 */
export function useConnectFlow() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FlowState>(minting);
  const [now, setNow] = useState(Date.now);
  // a new key per attempt, so a finished attempt's last answer never reaches the next one
  const [attempt, setAttempt] = useState(0);
  const [seenPoll, setSeenPoll] = useState(0);
  const [seenPollError, setSeenPollError] = useState(0);

  const view = clockTick(state, now);
  const polling = open && isPolling(view);

  // the countdown reads the clock; it ticks only while there is a countdown on screen
  const counting = view.kind === "qr" || view.kind === "code" || view.kind === "wrongCode";
  useEffect(() => {
    if (!open || !counting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open, counting]);

  const mint = useMutation(orpc.cosmoSession.qrStart.mutationOptions({ gcTime: 0 }));
  const certify = useMutation(
    orpc.cosmoSession.qrCertify.mutationOptions({
      gcTime: 0,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: cosmoSessionsOptions.queryKey }),
    }),
  );

  const poll = useQuery({
    ...orpc.cosmoSession.qrPoll.queryOptions({
      staleTime: 0,
      gcTime: 0,
      retry: false,
      enabled: polling,
      refetchInterval: QR_POLL_MS,
    }),
    queryKey: [...orpc.cosmoSession.qrPoll.key(), attempt],
  });

  // a new answer is folded into the state while rendering, not in an effect
  if (poll.data && poll.dataUpdatedAt !== seenPoll) {
    setSeenPoll(poll.dataUpdatedAt);
    setState(pollResult(state, poll.data, poll.dataUpdatedAt));
  }
  if (poll.error && poll.errorUpdatedAt !== seenPollError) {
    setSeenPollError(poll.errorUpdatedAt);
    setState(pollRefused(state, errorReason(poll.error).reason));
  }

  function start() {
    setOpen(true);
    setState(minting());
    setNow(Date.now());
    setAttempt((current) => current + 1);
    // only the latest call's callbacks run, so a reply to an abandoned start is dropped
    mint.mutate(undefined, {
      onSuccess: (result) => setState(started(result, Date.now())),
      onError: (error) => setState(refused(minting(), errorReason(error).reason)),
    });
  }

  function submit(otp: number) {
    setState(submitting(view));
    certify.mutate(
      { otp },
      {
        onSuccess: ({ nickname }) => setState(connected(nickname)),
        onError: (error) => setState((prev) => refused(prev, errorReason(error).reason)),
      },
    );
  }

  return {
    open,
    close: () => setOpen(false),
    start,
    submit,
    view,
    now,
  };
}

export type ConnectFlow = ReturnType<typeof useConnectFlow>;
