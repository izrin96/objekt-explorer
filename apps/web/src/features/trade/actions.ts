import { ORPCError } from "@orpc/client";
import type { Outputs } from "@repo/api";
import { startForPost } from "@repo/api/schemas/trade-post";
import { type InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { LIST_QUERY_KEY } from "@/features/list/queries";
import { currentUserOptions } from "@/features/user/queries";
import { addActionToast } from "@/lib/action-toast";
import { orpc } from "@/lib/orpc";
import { isRefusalError, refusalText } from "@/lib/refusal";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { usePlanLists } from "./post-plan";

function useTradeInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: orpc.trade.key() });
}

type PeoplePage = Outputs["trade"]["people"];

/** The page minus one person's row, keeping every other field it carries. */
function without(page: PeoplePage, userId: string): PeoplePage {
  return { ...page, people: page.people.filter((person) => person.userId !== userId) };
}

function useHidePartner() {
  const queryClient = useQueryClient();
  const invalidate = useTradeInvalidation();

  return useMutation(
    orpc.trade.hidePartner.mutationOptions({
      onMutate: async ({ userId }) => {
        const key = orpc.trade.people.key();
        await queryClient.cancelQueries({ queryKey: key });
        queryClient.setQueriesData<InfiniteData<PeoplePage>>({ queryKey: key }, (data) =>
          data ? { ...data, pages: data.pages.map((page) => without(page, userId)) } : data,
        );
      },
      onSettled: () => invalidate(),
      onError: () => {
        toastManager.add({ type: "error", title: m.trade_hide_error() });
      },
    }),
  );
}

/** Hide with a toast offering Undo, as every Hide in the app does. */
export function useHideWithUndo() {
  const hide = useHidePartner();
  const unhide = useUnhidePartner();

  // not `mutate`'s callbacks: hiding drops the row that calls this, and an unmounted observer skips them
  return (userId: string, name: string, onHidden?: () => void) =>
    void hide.mutateAsync({ userId }).then(
      () => {
        addActionToast(
          { type: "success", title: m.trade_hide_success({ name }) },
          { label: m.common_actions_undo(), onClick: () => unhide.mutate({ userId }) },
        );
        onHidden?.();
      },
      // the mutation's own onError shows the toast
      () => {},
    );
}

export function useUnhidePartner() {
  const invalidate = useTradeInvalidation();

  return useMutation(
    orpc.trade.unhidePartner.mutationOptions({
      onSuccess: () => invalidate(),
      onError: () => {
        toastManager.add({ type: "error", title: m.trade_unhide_error() });
      },
    }),
  );
}

function nextBumpOf(error: unknown) {
  if (!(error instanceof ORPCError) || error.code !== "TOO_MANY_REQUESTS") return undefined;
  const next = (error.data as { nextBumpAt?: unknown } | undefined)?.nextBumpAt;
  return typeof next === "string" ? next : undefined;
}

/** outside the hook: the compiler reads `Date.now` in a hook body as a render-time call */
function bumpTooSoon(next: string) {
  return m.trade_bump_too_soon({
    time: relativeTime(new Date(next).getTime(), Date.now(), "hour"),
  });
}

export function useBumpPost() {
  const invalidate = useTradeInvalidation();

  return useMutation(
    orpc.trade.bump.mutationOptions({
      onSuccess: () => toastManager.add({ type: "success", title: m.trade_bump_success() }),
      onError: (error) => {
        const next = nextBumpOf(error);
        toastManager.add(
          next
            ? { type: "error", title: bumpTooSoon(next) }
            : { type: "error", title: m.trade_bump_error() },
        );
      },
      onSettled: () => invalidate(),
    }),
  );
}

function usePostInvalidation() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey }),
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: orpc.list.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.trade.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.market.key() }),
    ]);
}

/** Saves a post from the composer; its lists, their link and Open to change together. */
export function useSavePost() {
  const invalidate = usePostInvalidation();

  return useMutation(
    orpc.trade.savePost.mutationOptions({
      onSuccess: (_, input) =>
        toastManager.add({
          type: "success",
          title: input.replaces ? m.trade_composer_saved() : m.trade_composer_posted(),
        }),
      onError: (error) => {
        toastManager.add({
          type: "error",
          title: m.trade_composer_error(),
          description: isRefusalError(error) ? refusalText(error) : undefined,
        });
      },
      onSettled: () => invalidate(),
    }),
  );
}

/** Takes a post off Trade; Undo on its toast posts the same lists again, with the same choice. */
export function useTakeDownPost() {
  const invalidate = usePostInvalidation();
  const lists = usePlanLists();
  const save = useSavePost();
  const takeDown = useMutation(
    orpc.trade.takeDownPost.mutationOptions({
      onError: () => toastManager.add({ type: "error", title: m.trade_take_off_error() }),
      onSettled: () => invalidate(),
    }),
  );

  return {
    isPending: takeDown.isPending,
    // not `mutate`'s callbacks: the row that calls this leaves Your posts, and an unmounted observer skips them
    takeDown: (slug: string) => {
      const { kind, have, want, sale, alsoPay } = startForPost(lists, slug);
      void takeDown.mutateAsync({ slug }).then(
        () => {
          const title = m.trade_take_off_success();
          if (!kind) return void toastManager.add({ type: "success", title });
          addActionToast(
            { type: "success", title },
            {
              label: m.common_actions_undo(),
              onClick: () => save.mutate({ kind, have, want, sale, alsoPay, replaces: null }),
            },
          );
        },
        // the mutation's own onError shows the toast
        () => {},
      );
    },
  };
}
