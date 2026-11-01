import { type ComposerStart, planPost } from "@repo/api/schemas/trade-post";
import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { m } from "@/paraglide/messages";

import { useSavePost } from "../actions";
import { type Choice, postInput } from "../composer-choice";
import { usePlanLists } from "../post-plan";
import { returnPath } from "./link";
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
  const [choice, setChoice] = useState<Choice>(() => ({ ...start, unpair: false }));
  const editing = start.replaces !== null;
  const kind = choice.kind;
  const request = kind ? postInput({ ...choice, kind }, start.replaces) : null;
  const plan = request ? planPost(lists, request) : null;
  const title = editing ? m.trade_composer_edit_title() : m.trade_new_post();

  return (
    <div className="flex flex-col gap-5">
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
      <PageHeader title={title} description={m.trade_composer_lists_prompt()} />

      {/* a flex column below `md`, not a grid, so the bar sticks across the whole page */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:items-start md:gap-x-8 md:gap-y-5">
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
        <div className="bg-background sticky bottom-0 z-10 -mx-5 -mb-10 border-t px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(4))] md:static md:col-start-1 md:row-start-2 md:m-0 md:border-0 md:bg-transparent md:p-0">
          <PostButton
            editing={editing}
            disabled={!plan?.ok}
            pending={save.isPending}
            className="w-full"
            onPost={() => {
              if (request && plan?.ok) {
                save.mutate(request, {
                  // an href, not a registered path, as sign-in's redirect is followed
                  onSuccess: () => router.history.push(returnPath(from)),
                });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
