import { ArrowClockwiseIcon, CardsThreeIcon } from "@phosphor-icons/react";
import { canBeOnTrade } from "@repo/api/schemas/list";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { WindowVirtualizer } from "virtua";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useSelectedArtists } from "@/features/artist/use-selected-artists";
import { canReset } from "@/features/filters/search-schema";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { collectionName } from "@/features/objekt/objekt-label";
import { useCurrentUser, useUserLists } from "@/features/user/hooks";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { BrowseFilters } from "./browse-filters";
import { BrowsePost, BrowsePostSkeleton } from "./browse-post";
import { type BrowseSearch, toBrowseInput } from "./browse-search";
import { LoadError } from "./load-error";
import { MyPosts } from "./my-posts";
import { PostListDialog } from "./post-list-dialog";
import { browseOptions, forYouOptions } from "./queries";
import { TagLabel } from "./tag-label";

type PostType = NonNullable<BrowseSearch["type"]> | "all";

const TYPES: PostType[] = ["all", "wtt", "wtb", "wts"];

/** `virtua` measures each post; the gap rides on the item so it is part of the measurement */
const POST_GAP = "pb-3";
const SSR_POSTS = 4;

export function BrowseView({ search }: { search: BrowseSearch }) {
  const { data: user } = useCurrentUser();
  const canMatch = useUserLists().some((list) =>
    canBeOnTrade(list.listTypeNew, list.isProfileBind),
  );
  const onlyMatches = canMatch && search.matches === 1;
  const { artists } = useCosmoArtist();
  const { data: selected } = useSelectedArtists();
  const input = useMemo(
    () => toBrowseInput(search, artists, selected),
    [search, artists, selected],
  );
  const query = useInfiniteQuery(browseOptions(input));
  // For you's own read, so a post's link only promises a row For you shows
  const mutual = useQuery({
    ...forYouOptions("mutual", undefined),
    staleTime: 60_000,
    enabled: Boolean(user),
  });
  const mutualIds = useMemo(
    () => new Set(mutual.data?.partners.map((p) => p.userId)),
    [mutual.data],
  );
  const navigate = useNavigate({ from: "/trade/" });
  // the drawer's On Trade link lands on this same page; the new slug closes the drawer
  const [opened, setOpened] = useState<{ objekt: ValidObjekt; slug?: string } | null>(null);
  const active = opened && opened.slug === search.slug ? opened.objekt : null;
  const setActive = (objekt: ValidObjekt | null) =>
    setOpened(objekt ? { objekt, slug: search.slug } : null);
  const [postOpen, setPostOpen] = useState(false);
  // one clock per page load, so every post's "3 hours ago" agrees
  const [now] = useState(Date.now);

  const setSearch = (patch: Partial<BrowseSearch>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
      resetScroll: false,
    });

  const type: PostType = search.type ?? "all";
  const filtering = canReset(search) || search.type !== undefined || search.slug !== undefined;
  const reset = () => void navigate({ search: {}, replace: true, resetScroll: false });
  const posts = useMemo(() => query.data?.pages.flatMap((page) => page.posts) ?? [], [query.data]);
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
          <Label className="cursor-pointer gap-2 text-sm font-medium">
            <Switch
              checked={onlyMatches}
              onCheckedChange={(on) => setSearch({ matches: on ? 1 : undefined })}
            />
            {m.trade_only_matches()}
          </Label>
        ) : null}
      </div>

      <BrowseFilters
        search={search}
        slugName={search.slug ? collectionName(search.slug, collections[search.slug]) : undefined}
        filtering={filtering}
        onClearSlug={() => setSearch({ slug: undefined })}
        onReset={reset}
      />

      {query.isPending ? (
        <>
          <PendingStatus />
          <BrowseFeedSkeleton />
        </>
      ) : query.isError && posts.length === 0 ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : posts.length === 0 && !query.hasNextPage && onlyMatches ? (
        <EmptyState
          icon={CardsThreeIcon}
          title={m.trade_browse_no_matches_title()}
          hint={m.trade_browse_no_matches_hint()}
          action={
            <Button variant="outline" size="sm" onClick={() => setSearch({ matches: undefined })}>
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
              virtua renders `ssrCount` items whether or not the data has that many */}
          <WindowVirtualizer data={posts} ssrCount={Math.min(SSR_POSTS, posts.length)}>
            {(post: (typeof posts)[number]) => (
              <div key={post.id} className={POST_GAP}>
                <BrowsePost
                  post={post}
                  own={post.userId === user?.user.id}
                  mutual={mutualIds.has(post.userId)}
                  collections={collections}
                  now={now}
                  onOpen={setActive}
                />
              </div>
            )}
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

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
      {user ? <PostListDialog open={postOpen} onOpenChange={setPostOpen} /> : null}
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
      <BrowsePostSkeleton />
      <BrowsePostSkeleton />
      <BrowsePostSkeleton />
    </div>
  );
}
