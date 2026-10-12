import { ArrowClockwiseIcon, CardsThreeIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { WindowVirtualizer } from "virtua";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useSelectedArtists } from "@/features/artist/use-selected-artists";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { collectionName } from "@/features/objekt/objekt-label";
import { useCurrentUser, useUserLists } from "@/features/user/hooks";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { BrowseFilters } from "./browse-filters";
import { BrowsePost, BrowsePostSkeleton } from "./browse-post";
import { type BrowseSearch, canMatchOf, matchModeOf, toBrowseInput } from "./browse-search";
import { comparedList, tradeListsOf } from "./compare-with";
import { HiddenPartnersDialog } from "./hidden-partners-dialog";
import { LoadError } from "./load-error";
import { MatchingControls } from "./matching-controls";
import { MyPosts } from "./my-posts";
import { PersonSheet } from "./person-sheet";
import { PostListDialog } from "./post-list-dialog";
import { browseOptions, hiddenPartnersOptions } from "./queries";
import { TagLabel } from "./tag-label";

type PostType = NonNullable<BrowseSearch["type"]> | "all";

const FACETS = ["artist", "member", "season", "class", "on_offline", "collection"] as const;

const TYPES: PostType[] = ["all", "wtt", "wtb", "wts"];

/** `virtua` measures each post; the gap rides on the item so it is part of the measurement */
const ROW_GAP = "pb-3";
const SSR_POSTS = 4;

export function BrowseView({ search }: { search: BrowseSearch }) {
  const { data: user } = useCurrentUser();
  const userLists = useUserLists();
  const canMatch = canMatchOf(userLists);
  const mode = matchModeOf(search, canMatch);
  const tradeLists = useMemo(() => tradeListsOf(userLists), [userLists]);
  const { artists } = useCosmoArtist();
  const { data: selected } = useSelectedArtists();
  const input = useMemo(
    () => toBrowseInput(search, artists, selected, canMatch),
    [search, artists, selected, canMatch],
  );
  const query = useInfiniteQuery(browseOptions(input));
  const hidden = useQuery(hiddenPartnersOptions(Boolean(user)));
  const navigate = useNavigate({ from: "/trade/" });
  // the drawer's On Trade link lands on this same page; the new slug closes the drawer
  const [opened, setOpened] = useState<{ objekt: ValidObjekt; slug?: string } | null>(null);
  const active = opened && opened.slug === search.slug ? opened.objekt : null;
  const setActive = (objekt: ValidObjekt | null) =>
    setOpened(objekt ? { objekt, slug: search.slug } : null);
  const [postOpen, setPostOpen] = useState(false);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const router = useRouter();
  // whether the open sheet pushed its own history entry, so closing can go back to the feed
  const pushedPerson = useRef(false);
  // one clock per page load, so every post's "3 hours ago" agrees
  const [now] = useState(Date.now);

  const setSearch = (patch: Partial<BrowseSearch>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
      resetScroll: false,
    });

  const openPerson = (userId: string) => {
    pushedPerson.current = true;
    void navigate({
      search: (prev) => ({ ...prev, person: userId }),
      resetScroll: false,
    });
  };
  const closePerson = () => {
    if (pushedPerson.current) {
      pushedPerson.current = false;
      router.history.back();
      return;
    }
    void navigate({
      search: (prev) => ({ ...prev, person: undefined }),
      replace: true,
      resetScroll: false,
    });
  };

  const type: PostType = search.type ?? "all";
  const filtering =
    search.type !== undefined ||
    search.slug !== undefined ||
    FACETS.some((key) => (search[key]?.length ?? 0) > 0);
  const reset = () => void navigate({ search: {}, replace: true, resetScroll: false });
  // a person who moved between two Mutual pages can come back once more: first place wins
  const posts = useMemo(() => {
    const seen = new Set<number>();
    return (query.data?.pages.flatMap((page) => page.posts) ?? []).filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [query.data]);
  const collections = useMemo(
    () => Object.assign({}, ...(query.data?.pages.map((page) => page.collections) ?? [])),
    [query.data],
  ) as Record<string, ValidObjekt | undefined>;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-muted-foreground text-sm text-pretty">{m.trade_browse_description()}</p>
        {user ? (
          <Button variant="outline" size="sm" onClick={() => setPostOpen(true)}>
            <CardsThreeIcon />
            {m.trade_post_a_list()}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            render={<Link to="/login" search={{ redirect: "/trade" }} />}
          >
            <CardsThreeIcon />
            {m.trade_post_a_list()}
          </Button>
        )}
      </div>

      {user ? <MyPosts /> : null}

      <BrowseFilters
        search={search}
        slugName={search.slug ? collectionName(search.slug, collections[search.slug]) : undefined}
        filtering={filtering}
        onClearSlug={() => setSearch({ slug: undefined })}
        onReset={reset}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Tabs
          value={type}
          onValueChange={(value) => {
            const next = TYPES.find((item) => item === value);
            if (next && next !== type) setSearch({ type: next === "all" ? undefined : next });
          }}
          /* a longer locale can outgrow a phone: the strip scrolls, the page does not */
          data-scroll-x
          className="max-w-full [scrollbar-width:none] overflow-x-auto"
        >
          <TabsList aria-label={m.trade_type_label()} className="w-max">
            {TYPES.map((item) => (
              <TabsTab key={item} value={item}>
                {item === "all" ? m.trade_filter_all() : <TagLabel tag={item} />}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
        {canMatch ? (
          <MatchingControls
            mode={mode}
            list={search.list}
            tradeLists={tradeLists}
            onChange={(patch) => setSearch({ match: mode, ...patch, matches: undefined })}
          />
        ) : user ? (
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <p className="text-pretty">{m.trade_browse_matches_need_list()}</p>
            <Button variant="outline" size="sm" onClick={() => setPostOpen(true)}>
              {m.trade_post_a_list()}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-pretty">
            {m.trade_browse_matches_sign_in()}{" "}
            <Button
              variant="link"
              className="h-auto p-0 text-sm underline underline-offset-2"
              render={<Link to="/login" search={{ redirect: "/trade" }} />}
            >
              {m.nav_sign_in()}
            </Button>
          </p>
        )}
      </div>

      {query.isPending ? (
        <>
          <PendingStatus />
          <BrowseFeedSkeleton />
        </>
      ) : query.isError && posts.length === 0 ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : posts.length === 0 && !query.hasNextPage && mode === "mutual" ? (
        <EmptyState
          icon={CardsThreeIcon}
          title={m.trade_browse_no_mutual_title()}
          hint={m.trade_browse_no_mutual_hint()}
          action={
            <Button variant="outline" size="sm" onClick={() => setSearch({ match: "any" })}>
              {m.trade_browse_show_any()}
            </Button>
          }
        />
      ) : posts.length === 0 && !query.hasNextPage && mode === "any" ? (
        <EmptyState
          icon={CardsThreeIcon}
          title={m.trade_browse_no_matches_title()}
          hint={m.trade_browse_no_matches_hint()}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearch({ match: "off", matches: undefined })}
            >
              {m.trade_browse_show_all_posts()}
            </Button>
          }
        />
      ) : posts.length === 0 && !query.hasNextPage ? (
        <EmptyState
          icon={CardsThreeIcon}
          title={m.trade_browse_empty_title()}
          hint={filtering ? m.trade_browse_empty_hint() : m.trade_browse_empty_none_hint()}
          action={
            filtering ? (
              <Button variant="outline" size="sm" onClick={reset}>
                {m.filter_reset_filter()}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          role="region"
          aria-label={m.trade_posts_label()}
          aria-busy={query.isPlaceholderData}
          className={cn(query.isPlaceholderData && "opacity-60")}
        >
          {/* the server draws the first posts, so a full load is not blank until hydration;
              until the first scroll, virtua keeps rendering the mount's `ssrCount` items even
              after a filter leaves fewer, so a row past the end comes in undefined */}
          <WindowVirtualizer data={posts} ssrCount={Math.min(SSR_POSTS, posts.length)}>
            {(post: (typeof posts)[number] | undefined) =>
              post ? (
                <div key={post.id} className={ROW_GAP}>
                  <BrowsePost
                    post={post}
                    own={post.userId === user?.user.id}
                    collections={collections}
                    now={now}
                    onOpen={setActive}
                    onOpenPerson={openPerson}
                  />
                </div>
              ) : (
                <div />
              )
            }
          </WindowVirtualizer>

          {query.isFetchNextPageError ? (
            <div className="flex justify-center py-4">
              <Button variant="outline" size="sm" onClick={() => void query.fetchNextPage()}>
                <ArrowClockwiseIcon />
                {m.common_error_retry()}
              </Button>
            </div>
          ) : (
            <InfiniteSentinel
              label={m.infinite_query_load_more_aria()}
              endLabel={m.trade_browse_end()}
              hasNextPage={query.hasNextPage}
              isFetchingNextPage={query.isFetchingNextPage}
              fetchNextPage={() => void query.fetchNextPage()}
            />
          )}
        </div>
      )}

      {/* Browse drops their posts silently, so name the way back */}
      {hidden.data && hidden.data.length > 0 && query.isSuccess && !query.hasNextPage ? (
        <p className="text-muted-foreground text-center text-sm text-pretty">
          {m.trade_browse_hidden_note()}{" "}
          <Button variant="link" className="h-auto p-0 text-sm" onClick={() => setHiddenOpen(true)}>
            {m.trade_hidden_partners()}
          </Button>
        </p>
      ) : null}

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
      {user ? <PostListDialog open={postOpen} onOpenChange={setPostOpen} /> : null}
      {user ? <HiddenPartnersDialog open={hiddenOpen} onOpenChange={setHiddenOpen} /> : null}
      {user && search.person ? (
        <PersonSheet
          key={search.person}
          userId={search.person}
          list={
            mode === "off"
              ? undefined
              : comparedList(search.list, tradeLists, mode === "mutual")?.slug
          }
          onClose={closePerson}
        />
      ) : null}
    </>
  );
}

/** The route's pending view, under the layout's header and tabs. */
export function BrowsePending() {
  return (
    <>
      <PendingStatus />
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="h-8 w-28 shrink-0 rounded-md" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-9 w-72 max-w-full rounded-lg" />
      </div>
      <BrowseFeedSkeleton />
    </>
  );
}

function BrowseFeedSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: SSR_POSTS }).map((_, index) => (
        <BrowsePostSkeleton key={index} />
      ))}
    </div>
  );
}
