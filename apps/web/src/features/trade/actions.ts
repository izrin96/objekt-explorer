import type { Outputs } from "@repo/api";
import { startForPost } from "@repo/api/schemas/trade-post";
import { type InfiniteData, matchQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { toastManager } from "@/components/ui/toast";
import { LIST_QUERY_KEY } from "@/features/list/queries";
import { currentUserOptions } from "@/features/user/queries";
import { addActionToast } from "@/lib/action-toast";
import { copyWithToast } from "@/lib/clipboard";
import { orpc } from "@/lib/orpc";
import { isRefusalError, refusalText } from "@/lib/refusal";
import { siteOrigin } from "@/lib/site-origin";
import { m } from "@/paraglide/messages";

import { postInput } from "./composer-choice";
import { usePlanLists } from "./post-plan";

/** Copies a person page, `/trade/@<handle>`, or with `slug` one of their post pages. */
export function useCopyTradeLink() {
  const router = useRouter();

  return async ({ handle, slug }: { handle: string; slug?: string }) => {
    const { href } =
      slug === undefined
        ? router.buildLocation({ to: "/trade/@{$handle}", params: { handle } })
        : router.buildLocation({ to: "/trade/@{$handle}/$slug", params: { handle, slug } });
    const url = new URL(href, siteOrigin()).toString();
    await copyWithToast(url, { title: m.list_share_copied(), description: url });
  };
}

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
      // the row is already gone: the feed refetches on its next mount, not now, since a refetch
      // replays every loaded page against the feed's rate limit
      onSuccess: async () => {
        const people = orpc.trade.people.key();
        await queryClient.invalidateQueries({ queryKey: people, refetchType: "none" });
        // a feed still on its first load had that load cancelled above, and nothing else restarts it
        await queryClient.refetchQueries({
          queryKey: people,
          type: "active",
          predicate: (query) => query.state.data === undefined,
        });
        await queryClient.invalidateQueries({
          queryKey: orpc.trade.key(),
          predicate: (query) => !matchQuery({ queryKey: people }, query),
        });
      },
      onError: () => {
        // puts the row back
        void invalidate();
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

export function useBumpPost() {
  const invalidate = useTradeInvalidation();

  return useMutation(
    orpc.trade.bump.mutationOptions({
      onSuccess: () => toastManager.add({ type: "success", title: m.trade_bump_success() }),
      onError: (error) => {
        toastManager.add({
          type: "error",
          title: isRefusalError(error) ? refusalText(error) : m.trade_bump_error(),
        });
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
    /** Resolves whether the post came off, so a caller can move on. */
    takeDown: (slug: string) => {
      const start = startForPost(lists, slug);
      return takeDown.mutateAsync({ slug }).then(
        () => {
          const title = m.trade_take_off_success();
          const { kind } = start;
          if (!kind) {
            toastManager.add({ type: "success", title });
            return true;
          }
          addActionToast(
            { type: "success", title },
            {
              label: m.common_actions_undo(),
              // the post as it was, Sell's swaps included
              onClick: () => save.mutate(postInput({ ...start, kind }, null)),
            },
          );
          return true;
        },
        // the mutation's own onError shows the toast
        () => false,
      );
    },
  };
}
