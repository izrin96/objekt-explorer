import {
  ArrowSquareOutIcon,
  CaretDownIcon,
  DotsThreeIcon,
  EyeSlashIcon,
} from "@phosphor-icons/react";
import { handleName } from "@repo/api/schemas/trade-person";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";
import { memo, type ReactNode, use, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { Frame, FramePanel } from "@/components/ui/frame";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { SafetyMenu } from "@/features/moderation/safety-menu";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { useCopyTradeLink, useHideWithUndo } from "./actions";
import type { Surface } from "./browse-search";
import { CopyLinkItem, ReasonItem } from "./copy-link-item";
import { MatchChip, MatchCounts } from "./match-summary";
import type { OpenObjekt } from "./near";
import { anchorOf, offerHandleOf } from "./person-page";
import { leadPost, listCount, matchBand, orderPosts, swapThroughRules } from "./person-row";
import { PostBlock } from "./post-block";
import { isEmptySide } from "./post-side";
import { postTime } from "./post-time";
import type { PersonData } from "./post-types";
import { SideCompareContext } from "./side-items-sheet";
import { TradeActions, type TradeContact } from "./trade-actions";
import { TradeHeader } from "./trade-header";
import { TradeSides } from "./trade-row";

/**
 * One person on Browse, For you or their person page: a header that says what they and the viewer
 * can swap, then a strip per list. The header sentence counts the person, each strip its own list.
 * With `focus` (a post page), only that post shows, outlined, and the row's actions address it;
 * the rest follow it once the viewer asks for them.
 *
 * Memoized: virtua calls the feed's render function for every visible row on each scroll update,
 * so without it every row on screen renders again while the page scrolls.
 */
export const PersonRow = memo(function PersonRow({
  person,
  surface,
  own,
  signedIn,
  focus,
  page = false,
  ownActions,
  collections,
  now,
  onOpen,
}: {
  person: PersonData;
  surface: Surface;
  /** the viewer's own row: no sentence, no counts, no rings, no actions */
  own: boolean;
  /** a signed-out visitor has no lists to match, so the row says nothing about matching */
  signedIn: boolean;
  /** a post page's post id, one of `person.posts` */
  focus?: number;
  /** on the person's own page, where the header also names their handle */
  page?: boolean;
  /** what the owner can do from a post page, where the row's actions would be */
  ownActions?: ReactNode;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  now: number;
  onOpen: OpenObjekt;
}) {
  const hide = useHideWithUndo();
  const copyLink = useCopyTradeLink();
  // the Compare with list and mode the row counts with, so Make offer adds what it counted
  const compare = use(SideCompareContext);
  const [expanded, setExpanded] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  // no match says nothing: a row without a chip or counts already reads as one
  const band = own || !signedIn ? null : matchBand(person.counts);
  const posts = orderPosts(person.posts);
  const focused = focus === undefined ? undefined : posts.find((post) => post.id === focus);
  const rest = focused ? posts.filter((post) => post !== focused) : [];
  const shownPosts = focused ? [focused, ...(expanded ? rest : [])] : posts;
  const throughRules = swapThroughRules(person.counts, person.posts);
  const lead = focused ?? leadPost(person.posts);
  const anchor = lead ? anchorOf(lead) : undefined;
  const counts = person.counts;
  const matches = !!counts && (counts.theyHave > 0 || counts.youHave > 0);
  const contact: TradeContact = own
    ? { kind: "own" }
    : person.messageable && anchor
      ? {
          kind: "open",
          target: { kind: "list", slug: anchor.list.slug },
          card: { kind: "post", listSlug: anchor.list.slug, withMatch: matches },
        }
      : { kind: "closed" };

  const newest = posts
    .map(postTime)
    .reduce((a, b) => (Date.parse(b.time) > Date.parse(a.time) ? b : a));
  // relative to the render: the server's minute and the browser's can differ
  const when = relativeTime(new Date(newest.time).getTime(), now);
  // a side with no copies draws no strip, so it is no list to the reader
  const keptLists = new Set(
    posts.flatMap((post) =>
      post.sides.filter((side) => !isEmptySide(side)).map((side) => side.list.id),
    ),
  ).size;
  const lists =
    keptLists === 1
      ? m.trade_person_lists_one()
      : m.trade_person_lists({ count: keptLists.toLocaleString(getLocale()) });

  // the row's matches are added (the Can swap pair, else the bigger side), its near matches
  // offered; a post page adds those through its one post, as that post's own Make offer does
  const offerMatches = focused
    ? !own &&
      signedIn &&
      focused.sides.some((side) => listCount(focused, side) > 0 || side.near) &&
      anchor
      ? { list: compare.list, mutual: compare.mutual || undefined, post: anchor.list.slug }
      : undefined
    : band ||
        (!own && signedIn && person.posts.some((post) => post.sides.some((side) => side.near)))
      ? { list: compare.list, mutual: compare.mutual || undefined }
      : undefined;
  const offerHandle = offerHandleOf(person);
  const actions = (
    <TradeActions
      contact={contact}
      name={person.identity.name}
      handle={offerHandle}
      offerClassName="@max-3xl:flex-1"
      matches={offerMatches}
    />
  );
  const copyReason = person.handle ? null : m.trade_post_copy_link_no_profile();
  // the page's own name for the person, which doesn't change with the viewer's matches
  const pageName = person.handle ? handleName(person.handle) : person.identity.name;
  const copyPerson = () => {
    if (person.handle) void copyLink({ handle: person.handle });
  };
  // left out on the person page itself, where it would lead nowhere new
  const viewPage =
    page && focus === undefined ? null : (
      <ReasonItem
        icon={ArrowSquareOutIcon}
        label={m.trade_person_view_page()}
        reason={copyReason}
        link={
          person.handle ? (
            <Link
              to="/trade/@{$handle}"
              params={{ handle: person.handle }}
              // a person page's loader reads the row against the feed's rate limit
              preload={false}
            />
          ) : undefined
        }
      />
    );

  return (
    // padding, not margin, so virtua measures the gap between people with the row
    <article className="@container pb-3">
      <Frame className="grid gap-x-4 gap-y-3 pt-2.5 @3xl:grid-cols-[minmax(0,1fr)_auto]">
        <TradeHeader
          className="min-w-0 px-3"
          person={person}
          you={own}
          handle={
            page && person.handle && handleName(person.handle) !== person.identity.name
              ? handleName(person.handle)
              : undefined
          }
          badge={
            band ? (
              <MatchChip band={band} throughRules={surface === "forYou" ? throughRules : 0} />
            ) : undefined
          }
          note={band ? <MatchCounts band={band} /> : undefined}
          meta={
            <>
              <span className="whitespace-nowrap">{lists}</span> ·{" "}
              <time dateTime={newest.time} suppressHydrationWarning className="whitespace-nowrap">
                {newest.changed
                  ? m.trade_updated_at({ time: when })
                  : m.trade_bumped_at({ time: when })}
              </time>
            </>
          }
        />
        {/* under the header at every width (beside it from @3xl), so the order read is the order seen */}
        {own ? (
          ownActions ? (
            <div className="flex flex-wrap items-center gap-2 px-3 @3xl:col-start-2 @3xl:row-start-1 @3xl:self-start">
              {ownActions}
            </div>
          ) : null
        ) : (
          <div className="flex items-center gap-2 px-3 @3xl:col-start-2 @3xl:row-start-1 @3xl:self-start">
            {signedIn ? (
              <SafetyMenu
                userId={person.userId}
                name={person.identity.name}
                report
                extraItems={
                  <>
                    {viewPage}
                    <CopyLinkItem reason={copyReason} onCopy={copyPerson} />
                    <MenuItem onClick={() => hide(person.userId, person.identity.name)}>
                      <EyeSlashIcon />
                      {m.trade_hide_partner()}
                    </MenuItem>
                  </>
                }
              />
            ) : (
              // SafetyMenu renders nothing signed out, and Hide, Block and Report need an account
              <Menu>
                <MenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label={m.mod_more_actions({ name: person.identity.name })}
                    />
                  }
                >
                  <DotsThreeIcon weight="bold" />
                </MenuTrigger>
                <MenuPopup align="end" className="min-w-44">
                  {viewPage}
                  <CopyLinkItem reason={copyReason} onCopy={copyPerson} />
                </MenuPopup>
              </Menu>
            )}
            {actions}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1 @3xl:col-span-2 @3xl:row-start-2">
          {shownPosts.map((post) => (
            <div
              key={post.id}
              // the first post "Show more" revealed takes focus, so the reader lands on it
              ref={focused && post === rest[0] ? moreRef : undefined}
              tabIndex={focused && post === rest[0] ? -1 : undefined}
              className="focus-visible:ring-ring rounded-lg outline-none focus-visible:ring-2"
            >
              <PostBlock
                post={post}
                surface={surface}
                own={own}
                contact={contact}
                name={person.identity.name}
                handle={person.handle}
                offerHandle={offerHandle}
                focused={post === focused}
                collections={collections}
                onOpen={onOpen}
              />
            </div>
          ))}
        </div>
      </Frame>
      {rest.length > 0 && !expanded ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            flushSync(() => setExpanded(true));
            moreRef.current?.focus();
          }}
        >
          <CaretDownIcon />
          {rest.length === 1
            ? m.trade_person_more_one({ name: pageName })
            : m.trade_person_more({
                count: rest.length.toLocaleString(getLocale()),
                name: pageName,
              })}
        </Button>
      ) : null}
    </article>
  );
});

/** A row's shape (header, actions, two strips), so the first page lands in place. */
export function PersonRowSkeleton() {
  return (
    <div className="@container pb-3">
      <Frame className="grid gap-x-4 gap-y-3 pt-2.5 @3xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex items-start gap-3 px-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="mx-3 h-8 w-28 rounded-md @3xl:col-start-2 @3xl:row-start-1" />
        <FramePanel className="p-3 @3xl:col-span-2 @3xl:row-start-2">
          <TradeSides
            strips={[0, 1].map((side) => (
              <div key={side} className="flex flex-col gap-1">
                <Skeleton className="h-3 w-12" />
                <div className="flex gap-x-1.5">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="aspect-photocard rounded-photocard w-10 shrink-0"
                    />
                  ))}
                </div>
              </div>
            ))}
          />
        </FramePanel>
      </Frame>
    </div>
  );
}
