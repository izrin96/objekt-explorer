import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Fragment } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { getListLinkOption } from "@/features/list/list-link";
import { LIST_TYPE_TONE } from "@/features/list/list-type-badge";
import { TagBadges } from "@/features/list/tag-label";
import { TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { Account } from "./shared";

type ReportedPost = NonNullable<Account["reports"][number]["post"]>;
type PostList = Pick<ReportedPost["reported"]["lists"][number], "id" | "type" | "name">;

const STATE: Record<
  ReportedPost["state"],
  { label: () => string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  posted: { label: m.mod_report_post_posted, variant: "success" },
  off_trade: { label: m.mod_report_post_off_trade, variant: "warning" },
  deleted: { label: m.mod_report_post_deleted, variant: "error" },
};

/** "doubles ⇄ wants", each name in its list type's ink. */
function ListNames({ lists }: { lists: PostList[] }) {
  return (
    <span className="min-w-0 font-medium break-words">
      {lists.map((list, i) => (
        <Fragment key={list.id}>
          {i > 0 ? <span className="text-muted-foreground"> ⇄ </span> : null}
          <span className={TONE_INK[LIST_TYPE_TONE[list.type]]}>{list.name}</span>
        </Fragment>
      ))}
    </span>
  );
}

const sameLists = (a: PostList[], b: PostList[]) =>
  a.length === b.length &&
  a.every((list, i) => list.id === b[i]?.id && list.type === b[i].type && list.name === b[i].name);

/**
 * The Trade post a report names: as it was when reported, and its state now. Staff see it
 * whatever hides it from Trade, so the link goes to the list page, never the post page.
 */
export function ReportPost({ post }: { post: ReportedPost }) {
  const { reported, state, now } = post;
  const changed =
    now !== null &&
    (now.tags.join() !== reported.tags.join() || !sameLists(now.lists, reported.lists));
  const descriptions = reported.lists.filter((list) => list.description !== null);
  const status = STATE[state];

  return (
    <section
      aria-label={m.mod_report_post_heading()}
      className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-muted-foreground text-xs font-medium">
          {m.mod_report_post_heading()}
        </span>
        <TagBadges tags={reported.tags} />
        <ListNames lists={reported.lists} />
        <Badge variant={status.variant} size="sm">
          {status.label()}
        </Badge>
      </div>
      {reported.onTrade ? null : (
        <p className="text-muted-foreground text-xs">{m.mod_report_post_not_on_trade()}</p>
      )}
      {changed ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-warning-foreground font-medium">{m.mod_report_post_changed()}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{m.mod_report_post_now()}</span>
          <TagBadges tags={now.tags} />
          <ListNames lists={now.lists} />
        </div>
      ) : null}
      {descriptions.length > 0 ? (
        <details className="rounded-md border">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer px-3 py-2 text-xs font-medium">
            {m.mod_report_post_descriptions()}
          </summary>
          <dl className="flex flex-col gap-3 border-t px-3 py-3">
            {descriptions.map((list) => (
              <div key={list.id} className="flex flex-col gap-1">
                <dt className={cn("text-xs font-medium", TONE_INK[LIST_TYPE_TONE[list.type]])}>
                  {list.name}
                </dt>
                <dd className="text-pretty break-words whitespace-pre-wrap">{list.description}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
      {now ? (
        <Link
          {...getListLinkOption(now)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 self-start rounded-sm text-xs font-medium underline-offset-2 outline-none hover:underline focus-visible:ring-2"
        >
          <ArrowSquareOutIcon aria-hidden />
          {m.mod_report_post_view_list()}
        </Link>
      ) : null}
    </section>
  );
}
