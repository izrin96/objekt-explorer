import { ArrowClockwiseIcon, ArrowFatLineUpIcon } from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { useBumpPost } from "./actions";
import { postTime } from "./browse-post";
import { ListRoleBadge } from "./list-role-badge";
import { myPostsOptions } from "./queries";

/** Hidden until the viewer has a list on Trade; Post a list sits beside the page description. */
export function MyPosts() {
  const query = useQuery(myPostsOptions());
  // times are relative to the fetch, which a bump refreshes
  const now = query.dataUpdatedAt;

  // the loader reads it first; a placeholder here would flash and vanish for viewers with no posts
  if (query.isPending) return null;
  if (query.isError) {
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
  if (query.data.length === 0) return null;

  return (
    <section aria-labelledby="my-posts-title" className="flex flex-col gap-2">
      <h2 id="my-posts-title" className="text-muted-foreground text-sm font-medium">
        {m.trade_my_posts_title()}
      </h2>
      <ul className="bg-card flex flex-col divide-y rounded-lg border">
        {query.data.map((post) => (
          <MyPostRow key={post.id} post={post} now={now} />
        ))}
      </ul>
    </section>
  );
}

type MyPost = Outputs["trade"]["myPosts"][number];

function MyPostRow({ post, now }: { post: MyPost; now: number }) {
  const bump = useBumpPost();
  const { changed, time } = postTime(post);
  const when = relativeTime(new Date(time).getTime(), now);

  // two columns, so Bump sits at the same top-right corner of every row however long the names
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {post.lists.map((list, index) => (
            <span key={list.slug} className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
              {index > 0 ? <span className="text-muted-foreground font-normal">+</span> : null}
              <ListRoleBadge type={list.listTypeNew} />
              <Link
                to="/list/$slug"
                params={{ slug: list.slug }}
                className="min-w-0 break-words underline-offset-2 hover:underline"
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
        <p className="text-muted-foreground text-xs text-pretty">
          <time dateTime={time}>
            {changed ? m.trade_updated_at({ time: when }) : m.trade_bumped_at({ time: when })}
          </time>
          {post.listed ? null : ` · ${m.trade_post_idle_hint()}`}
          {post.nextBumpAt
            ? ` · ${m.trade_bump_next({
                time: relativeTime(new Date(post.nextBumpAt).getTime(), now, "hour"),
              })}`
            : null}
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={post.nextBumpAt !== null}
        loading={bump.isPending}
        onClick={() => bump.mutate({ slug: post.slug })}
      >
        <ArrowFatLineUpIcon />
        {m.trade_bump()}
      </Button>
    </li>
  );
}
