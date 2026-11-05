import { ArrowFatLineDownIcon, WarningIcon } from "@phosphor-icons/react";
import { type ComposerStart, planPost } from "@repo/api/schemas/trade-post";
import { useQuery } from "@tanstack/react-query";
import { Link, useBlocker, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { useSavePost, useTakeDownPost } from "../actions";
import { type Choice, postInput } from "../composer-choice";
import { usePlanLists } from "../post-plan";
import { myPostsOptions } from "../queries";
import { picksChanged, returnAfter } from "./link";
import { ComposerPreview } from "./preview";
import { ComposerSettings, PostButton } from "./settings";

/**
 * New post and Edit post: a narrow settings column beside the post's preview, and below `md` the
 * preview under the settings with Post in a bar at the bottom. Mounted per search, so a new link
 * starts afresh while a list refetch keeps the picks.
 */
export function ComposerPage({ start, from }: { start: ComposerStart; from?: string }) {
  const lists = usePlanLists();
  const router = useRouter();
  const save = useSavePost();
  const takeDown = useTakeDownPost();
  // only the viewer's posts carry it, so a first post under a trade block goes unwarned
  const { data: posts } = useQuery(myPostsOptions());
  const tradeBlocked = posts?.[0]?.tradeBlocked ?? false;
  const [choice, setChoice] = useState<Choice>(() => ({ ...start, unpair: false }));
  const editing = start.replaces !== null;
  const kind = choice.kind;
  const request = kind ? postInput({ ...choice, kind }, start.replaces) : null;
  const plan = request ? planPost(lists, request) : null;
  const title = editing ? m.trade_composer_edit_title() : m.trade_new_post();
  // set once the post is saved or taken off, so leaving for the return page asks nothing
  const done = useRef(false);
  const holds = () => !done.current && picksChanged(start, choice);
  const blocker = useBlocker({
    shouldBlockFn: holds,
    enableBeforeUnload: holds,
    withResolver: true,
  });
  const leave = (anchor: string | null) => {
    done.current = true;
    // an href, not a registered path, as sign-in's redirect is followed
    router.history.push(returnAfter(from, start.replaces, anchor));
  };

  return (
    <div className="flex flex-1 flex-col gap-5">
      <nav aria-label={m.offer_breadcrumb()} className="text-sm">
        <ol className="text-muted-foreground flex items-center gap-2">
          <li>
            <Link to="/trade" className="hover:text-foreground">
              {m.nav_trade()}
            </Link>
          </li>
          <li aria-hidden className="text-muted-foreground/60">
            /
          </li>
          <li aria-current="page" className="text-foreground font-medium">
            {title}
          </li>
        </ol>
      </nav>
      <PageHeader
        title={title}
        description={m.trade_composer_lists_prompt()}
        aside={
          start.replaces ? (
            <Button
              variant="outline"
              size="sm"
              loading={takeDown.isPending}
              onClick={() => {
                const slug = start.replaces!;
                void takeDown.takeDown(slug).then((off) => {
                  if (off) leave(null);
                });
              }}
            >
              <ArrowFatLineDownIcon />
              {m.trade_take_off()}
            </Button>
          ) : undefined
        }
      />
      {tradeBlocked ? (
        <Alert variant="warning">
          <WarningIcon aria-hidden />
          <AlertDescription>{m.trade_post_copy_link_blocked()}</AlertDescription>
        </Alert>
      ) : null}

      {/* a flex column below `md`, not a grid, so the bar sticks across the whole page */}
      <div className="flex flex-col gap-6 max-md:flex-1 md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:items-start md:gap-x-8 md:gap-y-5">
        <ComposerSettings
          lists={lists}
          choice={choice}
          setChoice={setChoice}
          request={request}
          plan={plan}
          replaces={start.replaces}
          className="md:col-start-1 md:row-start-1"
        />
        <ComposerPreview
          request={request}
          lists={lists}
          className="md:col-start-2 md:row-span-2 md:row-start-1"
        />
        {/* -mx-5 -mb-10 undo PageMain's px-5 pb-10, so the phone bar spans the screen and sits flush */}
        {/* mt-auto: on a short page the bar still sits on the screen's bottom edge */}
        <div className="bg-background sticky bottom-0 z-10 -mx-5 mt-auto -mb-10 flex gap-2 border-t px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(4))] md:static md:col-start-1 md:row-start-2 md:m-0 md:border-0 md:bg-transparent md:p-0">
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.history.push(returnAfter(from, null, null))}
          >
            {m.common_modal_cancel()}
          </Button>
          <PostButton
            editing={editing}
            disabled={!plan?.ok}
            pending={save.isPending}
            className="flex-1"
            onPost={() => {
              if (request && plan?.ok) {
                save.mutate(request, {
                  onSuccess: () => leave(request.have ?? request.sale ?? request.want ?? null),
                });
              }
            }}
          />
        </div>
      </div>
      <AlertDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editing ? m.trade_composer_discard_title_edit() : m.trade_composer_discard_title()}
            </AlertDialogTitle>
            <AlertDialogDescription>{m.trade_composer_discard_desc()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {m.offer_discard_keep()}
            </AlertDialogClose>
            <Button variant="destructive" onClick={() => blocker.proceed?.()}>
              {m.offer_discard_confirm()}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}
