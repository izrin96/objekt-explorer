import {
  ArrowFatLineDownIcon,
  ArrowFatLineUpIcon,
  ArrowLeftIcon,
  CardsThreeIcon,
  InfoIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import { handleName } from "@repo/api/schemas/trade-person";
import { startForPost } from "@repo/api/schemas/trade-post";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useSelectedArtists } from "@/features/artist/use-selected-artists";
import { AddToListProvider } from "@/features/list/add-to-list-dialog";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { useCurrentUser, useUserLists } from "@/features/user/hooks";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { useBumpPost, useCopyTradeLink, useTakeDownPost } from "./actions";
import { personSearch } from "./browse-loader";
import { toBrowseInput } from "./browse-search";
import { tradeListsOf } from "./compare-rule";
import { NEW_POST } from "./composer/link";
import { useOpenComposer } from "./composer/use-open-composer";
import { LoadError } from "./load-error";
import { ownEmptyKind } from "./my-posts-summary";
import type { NearOpen, ObjektAsk } from "./near";
import { NearNote } from "./near-note";
import { ObjektOfferNote } from "./objekt-offer-note";
import { anchorOf, slugTarget } from "./person-page";
import { PersonRow, PersonRowSkeleton } from "./person-row-view";
import { usePlanLists } from "./post-plan";
import { myPostsOptions, peopleOptions } from "./queries";
import { sharePreview } from "./share-preview";
import { SideCompareContext } from "./side-items-sheet";

/** a person page counts against all of the viewer's lists, as Browse does */
const NO_COMPARE = { list: undefined, mutual: false };

/**
 * A person's Trade row as a page (`/trade/@<handle>`), or, with `slug`, one post of it
 * (`/trade/@<handle>/<slug>`): the row Browse draws, under Back to Trade.
 */
export function PersonPageView({
  userId,
  handle,
  slug,
}: {
  userId: string;
  handle: string;
  slug?: string;
}) {
  const { data: user } = useCurrentUser();
  const userLists = useUserLists();
  const tradeLists = useMemo(() => tradeListsOf(userLists), [userLists]);
  const { artists } = useCosmoArtist();
  const { data: selected } = useSelectedArtists();
  const input = useMemo(
    () => toBrowseInput(personSearch(userId), artists, selected, "browse", tradeLists),
    [userId, artists, selected, tradeLists],
  );
  const query = useInfiniteQuery(peopleOptions(input));
  const openComposer = useOpenComposer();
  const [opened, setOpened] = useState<{
    objekt: ValidObjekt;
    near?: NearOpen;
    ask?: ObjektAsk;
  } | null>(null);
  const setActive = (objekt: ValidObjekt | null, near?: NearOpen, ask?: ObjektAsk) =>
    setOpened(objekt ? { objekt, near, ask } : null);
  // rows read from their fetch, so "3 hours ago" agrees with the server's render
  const [now, setNow] = useState(query.dataUpdatedAt);
  if (!query.isPlaceholderData && query.dataUpdatedAt !== now) setNow(query.dataUpdatedAt);

  // the previous person's row stands in while another loads; it must never show as this one's
  const current = query.isPlaceholderData ? undefined : query.data?.pages[0];
  const row = current?.people.find((person) => person.userId === userId) ?? null;
  const collections = current?.collections ?? {};
  // from the page's user, not the row: with no row the owner still sees their own empty state
  const own = !!user && userId === user.user.id;
  const myPosts = useQuery({ ...myPostsOptions(), enabled: own });

  const target = row && slug !== undefined ? slugTarget(row.posts, slug) : undefined;
  const focused =
    target?.kind === "post"
      ? target.post
      : target?.kind === "anchor"
        ? row?.posts.find((post) => anchorOf(post)?.list.slug === target.slug)
        : undefined;
  const gone = slug !== undefined && current !== undefined && !focused;

  return (
    <AddToListProvider>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <h1 className="sr-only">
          {row && focused
            ? sharePreview({ handle, posts: row.posts }, focused).title
            : m.trade_share_person_title({ name: handleName(handle) })}
        </h1>
        <BackToTrade />

        {gone ? (
          <Alert variant="info" role="status">
            <InfoIcon />
            <AlertDescription>{m.trade_post_gone()}</AlertDescription>
          </Alert>
        ) : null}

        {current === undefined && query.isError ? (
          <LoadError error={query.error} onRetry={() => void query.refetch()} />
        ) : current === undefined ? (
          <>
            <PendingStatus />
            <PersonRowSkeleton />
          </>
        ) : !row && own && myPosts.data ? (
          <OwnEmpty kind={ownEmptyKind(myPosts.data)} />
        ) : !row && own && myPosts.isError ? (
          <LoadError error={myPosts.error} onRetry={() => void myPosts.refetch()} />
        ) : !row && own ? (
          <>
            <PendingStatus />
            <PersonRowSkeleton />
          </>
        ) : !row ? (
          <EmptyState
            icon={CardsThreeIcon}
            title={m.trade_person_nothing_title()}
            hint={m.trade_person_nothing_hint({ name: handleName(handle) })}
          />
        ) : (
          <SideCompareContext value={NO_COMPARE}>
            <PersonRow
              // a new post page starts folded again
              key={focused?.id ?? "all"}
              person={row}
              surface="browse"
              own={own}
              signedIn={!!user}
              focus={focused?.id}
              page
              ownActions={
                !own ? undefined : focused ? (
                  <OwnPostActions handle={handle} slug={anchorOf(focused)?.list.slug ?? ""} />
                ) : (
                  <OwnBump />
                )
              }
              collections={collections}
              now={now}
              onOpen={setActive}
            />
          </SideCompareContext>
        )}
      </div>

      <ObjektDrawer
        objekt={opened?.objekt ?? null}
        onClose={() => setActive(null)}
        note={
          opened?.near ? (
            <NearNote
              objekt={opened.objekt}
              near={opened.near}
              onClose={() => setActive(null)}
              onCompose={openComposer}
            />
          ) : opened?.ask ? (
            // a near match's line carries its own Make offer
            <ObjektOfferNote ask={opened.ask} onClose={() => setActive(null)} />
          ) : undefined
        }
      />
    </AddToListProvider>
  );
}

/** A person page whose handle lookup was refused (the rate limit): a way to try again. */
/** `refusal`: why the lookup was refused, worded, when it was a refusal the app words (the rate limit). */
export function PersonPageRefused({ refusal }: { refusal: string | null }) {
  const router = useRouter();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
      <h1 className="sr-only">{m.nav_trade()}</h1>
      <BackToTrade />
      <LoadError hint={refusal} onRetry={() => void router.invalidate()} />
    </div>
  );
}

function BackToTrade() {
  return (
    <Button variant="ghost" size="sm" className="-ms-2 w-fit" render={<Link to="/trade" />}>
      <ArrowLeftIcon />
      {m.trade_person_back()}
    </Button>
  );
}

/**
 * Why the owner's row doesn't show, and the fix: New post, Bump with Your posts, or Your posts.
 * Your posts is the row on Browse.
 */
function OwnEmpty({ kind }: { kind: ReturnType<typeof ownEmptyKind> }) {
  const openComposer = useOpenComposer();
  const openPosts = (
    <Button variant="outline" size="sm" render={<Link to="/trade" />}>
      {m.trade_own_open_posts()}
    </Button>
  );
  if (kind === "none") {
    return (
      <EmptyState
        icon={CardsThreeIcon}
        title={m.trade_my_posts_empty_title()}
        hint={m.trade_my_posts_empty_hint()}
        action={
          <Button size="sm" onClick={() => openComposer(NEW_POST)}>
            <PlusIcon />
            {m.trade_new_post()}
          </Button>
        }
      />
    );
  }
  if (kind === "blocked") {
    return (
      <EmptyState
        icon={CardsThreeIcon}
        title={m.trade_own_blocked_title()}
        hint={m.trade_post_copy_link_blocked()}
      />
    );
  }
  if (kind === "idle") {
    return (
      <EmptyState
        icon={CardsThreeIcon}
        title={m.trade_own_idle_title()}
        hint={m.trade_own_idle_hint()}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <OwnBump />
            {openPosts}
          </div>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={CardsThreeIcon}
      title={m.trade_own_empty_title()}
      hint={m.trade_own_empty_hint()}
      action={openPosts}
    />
  );
}

/**
 * The owner's Bump, one for every post as in Your posts, which reads the same `myPosts`. Disabled
 * until the next bump is allowed, with that time beside it.
 */
function OwnBump() {
  const query = useQuery(myPostsOptions());
  const bump = useBumpPost();
  const nextBumpAt = query.data?.[0]?.nextBumpAt ?? null;
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={!query.data || nextBumpAt !== null}
        loading={bump.isPending}
        onClick={() => bump.mutate()}
      >
        <ArrowFatLineUpIcon />
        {m.trade_bump()}
      </Button>
      {nextBumpAt ? (
        <span className="text-muted-foreground text-sm">
          {m.trade_bump_next({
            time: relativeTime(new Date(nextBumpAt).getTime(), query.dataUpdatedAt, "hour"),
          })}
        </span>
      ) : null}
    </>
  );
}

/** The owner's Edit post, Copy link, Take off Trade and Bump, as Your posts offers them. */
function OwnPostActions({ handle, slug }: { handle: string; slug: string }) {
  const openComposer = useOpenComposer();
  const planLists = usePlanLists();
  const copyLink = useCopyTradeLink();
  const takeDown = useTakeDownPost();
  return (
    <>
      <Button size="sm" onClick={() => openComposer(startForPost(planLists, slug))}>
        <PencilSimpleIcon />
        {m.trade_composer_edit_title()}
      </Button>
      <Button variant="outline" size="sm" onClick={() => void copyLink({ handle, slug })}>
        <ShareNetworkIcon />
        {m.trade_post_copy_link()}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        loading={takeDown.isPending}
        onClick={() => void takeDown.takeDown(slug)}
      >
        <ArrowFatLineDownIcon />
        {m.trade_take_off()}
      </Button>
      <OwnBump />
    </>
  );
}
