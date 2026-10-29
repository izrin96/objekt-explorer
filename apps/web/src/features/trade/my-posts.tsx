import {
  ArrowClockwiseIcon,
  ArrowFatLineDownIcon,
  ArrowFatLineUpIcon,
  CaretDownIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import { useQuery } from "@tanstack/react-query";
import { Link, useHydrated, useRouter } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { MonoMessage } from "@/features/offers/mono";
import { copyWithToast } from "@/lib/clipboard";
import { relativeTime } from "@/lib/time";
import { getBaseURL } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useSettings } from "@/stores/settings";

import { useBumpPost, useTakeDownPost } from "./actions";
import { summarizePosts } from "./my-posts-summary";
import { postLinkSearch } from "./post-link";
import { KIND_LABEL } from "./post-list-dialog";
import { postTime } from "./post-time";
import { myPostsOptions } from "./queries";
import { TagBadges } from "./tag-label";

type MyPostsProps = { userId: string; onNew: () => void; onEdit: (slug: string) => void };

/** The viewer's posts on Browse, one row each, with New post in the header. */
export function MyPosts({ userId, onNew, onEdit }: MyPostsProps) {
  const query = useQuery(myPostsOptions());
  const bump = useBumpPost();
  const copyLink = useCopyTradeLink();
  const saved = useSettings((s) => s.myPostsShown);
  const setSettings = useSettings((s) => s.set);
  const hydrated = useHydrated();
  // times are relative to the fetch, which a bump refreshes
  const now = query.dataUpdatedAt;

  // the loader reads it first; a placeholder here would flash and vanish for viewers with no posts
  if (query.isPending) return null;
  if (query.isError && !query.data) {
    return (
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm">
        <p>{m.trade_my_posts_error()}</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          <ArrowClockwiseIcon />
          {m.common_error_retry()}
        </Button>
      </div>
    );
  }
  const posts = query.data;
  if (posts.length === 0) {
    return (
      <section
        aria-labelledby="my-posts-title"
        className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="my-posts-title" className="text-sm font-medium">
            {m.trade_my_posts_empty_title()}
          </h2>
          <p className="text-muted-foreground text-sm text-pretty">
            {m.trade_my_posts_empty_hint()}
          </p>
        </div>
        <Button size="sm" onClick={onNew}>
          <PlusIcon />
          {m.trade_new_post()}
        </Button>
      </section>
    );
  }
  // every post carries the same last and next bump: Bump is one per person, so its time shows
  // once here instead of on each row
  const lastBumpAt = posts[0]?.lastBumpAt ?? null;
  const nextBumpAt = posts[0]?.nextBumpAt ?? null;

  const summary = summarizePosts(posts);
  // the server cannot read the saved choice, so the default holds until hydration
  const open = hydrated ? (saved ?? summary.shownByDefault) : summary.shownByDefault;

  return (
    <section aria-labelledby="my-posts-title">
      <Collapsible
        open={open}
        onOpenChange={(next) => setSettings({ myPostsShown: next })}
        className="bg-card rounded-lg border"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex min-w-0 grow basis-64 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <h2 id="my-posts-title" className="text-muted-foreground font-medium">
              {m.trade_my_posts_title()}
            </h2>
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
            <span className="text-muted-foreground tabular-nums">
              <MonoMessage
                values={[summary.listed]}
                text={([count]) => m.trade_my_posts_listed({ count: count! })}
              />
            </span>
            {summary.idle > 0 ? (
              <>
                <span aria-hidden className="text-muted-foreground">
                  ·
                </span>
                <Badge variant="outline" size="sm" className="tabular-nums">
                  <MonoMessage
                    values={[summary.idle]}
                    text={([count]) => m.trade_my_posts_idle({ count: count! })}
                  />
                </Badge>
              </>
            ) : null}
            {lastBumpAt ? (
              <>
                <span aria-hidden className="text-muted-foreground">
                  ·
                </span>
                <time dateTime={lastBumpAt} className="text-muted-foreground tabular-nums">
                  {m.trade_bumped_at({ time: relativeTime(new Date(lastBumpAt).getTime(), now) })}
                </time>
              </>
            ) : null}
            {nextBumpAt ? (
              <>
                <span aria-hidden className="text-muted-foreground">
                  ·
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {m.trade_bump_next({
                    time: relativeTime(new Date(nextBumpAt).getTime(), now, "hour"),
                  })}
                </span>
              </>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {/* with every post idle the feed leaves the row out, so there is nothing to link to */}
            <Button
              variant="outline"
              size="sm"
              disabled={summary.listed === 0}
              onClick={() => void copyLink({ person: userId })}
            >
              <ShareNetworkIcon />
              {m.trade_post_copy_link()}
            </Button>
            <Button size="sm" onClick={onNew}>
              <PlusIcon />
              {m.trade_new_post()}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={nextBumpAt !== null}
              loading={bump.isPending}
              onClick={() => bump.mutate()}
            >
              <ArrowFatLineUpIcon />
              {m.trade_bump()}
            </Button>
            <CollapsibleTrigger render={<Button variant="ghost" size="sm" className="group" />}>
              {open ? m.trade_my_posts_hide() : m.trade_my_posts_show()}
              <CaretDownIcon
                aria-hidden
                className="transition-transform group-data-panel-open:rotate-180"
              />
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsiblePanel>
          <ul className="flex flex-col divide-y border-t">
            {posts.map((post) => (
              <MyPostRow key={post.id} post={post} userId={userId} now={now} onEdit={onEdit} />
            ))}
          </ul>
        </CollapsiblePanel>
      </Collapsible>
    </section>
  );
}

type MyPost = Outputs["trade"]["myPosts"][number];

const ROLE_LABEL = {
  have: m.trade_role_have,
  want: m.trade_role_want,
  sale: m.trade_role_sale,
} as const;

/** Copies a Browse address led by the viewer's row: all their posts, or one post's type. */
function useCopyTradeLink() {
  const router = useRouter();

  return async (search: ReturnType<typeof postLinkSearch> | { person: string }) => {
    const { href } = router.buildLocation({ to: "/trade", search });
    const url = new URL(href, getBaseURL()).toString();
    await copyWithToast(url, { title: m.list_share_copied(), description: url });
  };
}

function MyPostRow({
  post,
  userId,
  now,
  onEdit,
}: {
  post: MyPost;
  userId: string;
  now: number;
  onEdit: (slug: string) => void;
}) {
  const takeDown = useTakeDownPost();
  const copyLink = useCopyTradeLink();
  const { changed, time } = postTime(post);
  const when = relativeTime(new Date(time).getTime(), now);
  const details = [
    post.kind === "sell" ? m.trade_post_option_market() : null,
    post.alsoPay ? m.trade_post_option_also_pay() : null,
    changed ? m.trade_updated_at({ time: when }) : null,
    post.listed ? null : m.trade_post_idle_hint(),
  ].filter((part) => part !== null);

  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <TagBadges tags={post.tags} />
          <span className="font-medium">{KIND_LABEL[post.kind]()}</span>
          {post.lists.map((list) => (
            <span key={list.slug} className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden className="text-muted-foreground">
                ·
              </span>
              <span className="text-muted-foreground">{ROLE_LABEL[list.role]()}</span>
              <Link
                to="/list/$slug"
                params={{ slug: list.slug }}
                className="min-w-0 font-medium break-words underline-offset-2 hover:underline"
              >
                {list.name}
              </Link>
            </span>
          ))}
          {post.listed ? (
            <Badge variant="secondary" size="sm">
              {m.trade_post_listed()}
            </Badge>
          ) : (
            <Badge variant="outline" size="sm">
              {m.trade_idle()}
            </Badge>
          )}
        </div>
        {details.length > 0 ? (
          <p className="text-muted-foreground text-xs text-pretty">{details.join(" · ")}</p>
        ) : null}
      </div>
      <Menu>
        <MenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label={m.trade_post_actions()}
              loading={takeDown.isPending}
            />
          }
        >
          <DotsThreeIcon weight="bold" />
        </MenuTrigger>
        <MenuPopup align="end" className="max-w-64">
          <MenuItem onClick={() => onEdit(post.slug)}>
            <PencilSimpleIcon />
            {m.trade_composer_edit_title()}
          </MenuItem>
          {/* the feed leaves idle posts out, so their link would open Browse without the row */}
          <MenuItem
            disabled={!post.listed}
            onClick={() => void copyLink(postLinkSearch(userId, post))}
          >
            <ShareNetworkIcon />
            <span className="flex flex-col">
              {m.trade_post_copy_link()}
              {post.listed ? null : (
                <span className="text-xs text-pretty">{m.trade_post_copy_link_idle()}</span>
              )}
            </span>
          </MenuItem>
          <MenuItem onClick={() => takeDown.takeDown(post.slug)}>
            <ArrowFatLineDownIcon />
            {m.trade_take_off()}
          </MenuItem>
        </MenuPopup>
      </Menu>
    </li>
  );
}
