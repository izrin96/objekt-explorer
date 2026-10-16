import type { PostCardView } from "@repo/api/schemas/chat";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { getListLinkOption } from "@/features/list/list-link";
import { OfferThumb } from "@/features/offers/offer-item";
import { formatCurrency } from "@/features/settings/use-currency";
import { TagBadge } from "@/features/trade/tag-label";
import { TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

type Collections = Readonly<Record<string, ValidObjekt | undefined>>;
type PostSide = NonNullable<NonNullable<PostCardView["post"]>["has"]>;
type MatchSide = NonNullable<PostCardView["match"]>["ownerHas"];

/**
 * A Trade post, read live, or the overlap saved when it was sent. `mine` is whether the viewer
 * sent it: a match is saved as the owner's and the sender's, and reads from the viewer's side.
 */
export function PostCardMessage({
  view,
  mine,
  collections,
  onOpen,
  action,
}: {
  view: PostCardView;
  mine: boolean;
  collections: Collections;
  onOpen: (objekt: ValidObjekt) => void;
  action?: ReactNode;
}) {
  const { post, match } = view;

  return (
    <div className="bg-background relative flex w-72 max-w-full flex-col gap-2 rounded-xl border p-2.5 text-sm">
      {action ? <div className="absolute end-1 top-1">{action}</div> : null}
      {post ? (
        <p className={cn("flex min-w-0 items-center gap-2", action && "pe-7")}>
          <TagBadge tag={post.tag} />
          <span className="min-w-0 truncate font-medium">
            {m.chat_post_title({ name: post.owner.name })}
          </span>
        </p>
      ) : (
        <p className={cn("text-muted-foreground", action && "pe-7")}>{m.chat_post_removed()}</p>
      )}

      {match ? (
        <>
          <MatchRow
            side={match.ownerHas}
            label={mine ? m.chat_match_theirs : m.chat_match_yours}
            collections={collections}
            onOpen={onOpen}
          />
          <MatchRow
            side={match.senderHas}
            label={mine ? m.chat_match_yours : m.chat_match_theirs}
            collections={collections}
            onOpen={onOpen}
          />
        </>
      ) : post ? (
        <>
          {post.has ? (
            <Strip
              label={m.chat_post_has()}
              tone={post.tag === "wts" ? "sale" : "have"}
              side={post.has}
              collections={collections}
              onOpen={onOpen}
            />
          ) : null}
          {post.wants ? (
            <Strip
              label={m.chat_post_wants()}
              tone="want"
              side={post.wants}
              collections={collections}
              onOpen={onOpen}
            />
          ) : post.price ? (
            <p className="font-mono font-semibold tabular-nums">
              {post.price.min === post.price.max
                ? formatCurrency(post.price.min, post.price.currency)
                : m.chat_post_price({
                    min: formatCurrency(post.price.min, post.price.currency),
                    max: formatCurrency(post.price.max, post.price.currency),
                  })}
            </p>
          ) : null}
        </>
      ) : null}

      {post ? (
        <Link
          // the sender opens the owner on Trade; the owner, who receives it, opens their own list
          {...(mine
            ? { to: "/trade", search: { person: post.owner.userId } }
            : getListLinkOption(post.list))}
          className="self-start text-xs font-medium underline underline-offset-2 hover:no-underline"
        >
          {m.chat_post_open()}
        </Link>
      ) : null}
    </div>
  );
}

function Thumbs({
  slugs,
  collections,
  onOpen,
  className,
}: {
  slugs: readonly string[];
  collections: Collections;
  onOpen: (objekt: ValidObjekt) => void;
  className: string;
}) {
  return slugs.map((slug) => (
    <li key={slug} className={className}>
      <OfferThumb slug={slug} collection={collections[slug]} onOpen={onOpen} className="w-full" />
    </li>
  ));
}

function Strip({
  label,
  tone,
  side: { slugs, more },
  collections,
  onOpen,
}: {
  label: string;
  tone: "have" | "want" | "sale";
  side: PostSide;
  collections: Collections;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-1">
      <h3 className={cn("font-mono text-xs uppercase", TONE_INK[tone])}>{label}</h3>
      {slugs.length === 0 ? (
        <p className="text-muted-foreground text-xs">{m.trade_strip_none()}</p>
      ) : (
        <ul className="flex min-w-0 items-center gap-1 overflow-hidden">
          <Thumbs
            slugs={slugs}
            collections={collections}
            onOpen={onOpen}
            className="w-8 shrink-0"
          />
          {more > 0 ? (
            <li className="text-muted-foreground ps-1 font-mono text-xs tabular-nums">
              <span aria-hidden>+{more}</span>
              <span className="sr-only">{m.trade_more_count({ count: more })}</span>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

function MatchRow({
  side: { count, slugs },
  label,
  collections,
  onOpen,
}: {
  side: MatchSide;
  label: (inputs: { count: number }) => ReactNode;
  collections: Collections;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  if (count === 0) return null;
  return (
    <section className="flex min-w-0 flex-col gap-1.5">
      <h3 className="text-sm tabular-nums">{label({ count })}</h3>
      <ul className="flex min-w-0 items-center gap-1.5">
        <Thumbs slugs={slugs} collections={collections} onOpen={onOpen} className="w-10 shrink-0" />
      </ul>
    </section>
  );
}
