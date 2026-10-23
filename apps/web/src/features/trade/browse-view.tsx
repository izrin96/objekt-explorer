import { ArrowClockwiseIcon, CardsThreeIcon } from "@phosphor-icons/react";
import { startForPost } from "@repo/api/schemas/trade-post";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useHydrated, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { WindowVirtualizer } from "virtua";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useSelectedArtists } from "@/features/artist/use-selected-artists";
import { SingleSelect } from "@/features/filters/single-select";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { collectionName } from "@/features/objekt/objekt-label";
import { OfferBuilderProvider } from "@/features/offers/offer-builder";
import { useCurrentUser, useUserLists } from "@/features/user/hooks";
import { useWindowVirtualizerRestore } from "@/lib/use-window-virtualizer-restore";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { BrowseFilters } from "./browse-filters";
import {
  type FeedSearch,
  type Surface,
  forYouFallback,
  matchModeOf,
  postTypeOf,
  toBrowseInput,
} from "./browse-search";
import { comparedList, scopeOf, tradeListsOf } from "./compare-rule";
import { HiddenPartnersDialog } from "./hidden-partners-dialog";
import { LoadError } from "./load-error";
import { ComparedLine, MatchingControls } from "./matching-controls";
import { MyPosts } from "./my-posts";
import { PersonRow, PersonRowSkeleton } from "./person-row-view";
import { NEW_POST, PostComposer, useComposer } from "./post-list-dialog";
import { usePlanLists } from "./post-plan";
import type { PersonData } from "./post-types";
import { hiddenPartnersOptions, peopleOptions } from "./queries";
import { tagText } from "./tag-label";

type PostType = NonNullable<FeedSearch["type"]> | "all";

type FeedRow =
  | { heading: "mutual" | "oneWay"; person?: undefined }
  | { person: PersonData; heading?: undefined };

const FACETS = ["artist", "member", "season", "class", "on_offline", "collection"] as const;

const TYPES: PostType[] = ["all", "wtt", "wtb", "wts"];

/** rows the server draws, and the skeleton's count */
const SSR_ROWS = 4;

export function BrowseView({ surface, search }: { surface: Surface; search: FeedSearch }) {
  const { data: user } = useCurrentUser();
  const hydrated = useHydrated();
  const userLists = useUserLists();
  const forYou = surface === "forYou";
  const mode = forYou ? matchModeOf(search) : "off";
  const tradeLists = useMemo(() => tradeListsOf(userLists), [userLists]);
  const { artists } = useCosmoArtist();
  const { data: selected } = useSelectedArtists();
  const input = useMemo(
    () => toBrowseInput(search, artists, selected, surface, tradeLists),
    [search, artists, selected, surface, tradeLists],
  );
  const query = useInfiniteQuery(peopleOptions(input));
  const hidden = useQuery(hiddenPartnersOptions(Boolean(user)));
  const navigate = useNavigate();
  // the drawer's On Trade link lands on this same page; the new slug closes the drawer
  const [opened, setOpened] = useState<{ objekt: ValidObjekt; slug?: string } | null>(null);
  const active = opened && opened.slug === search.slug ? opened.objekt : null;
  const setActive = (objekt: ValidObjekt | null) =>
    setOpened(objekt ? { objekt, slug: search.slug } : null);
  const composer = useComposer();
  const planLists = usePlanLists();
  const [hiddenOpen, setHiddenOpen] = useState(false);
  // a scrolled-off row loses its own state, so the feed keeps which rows showed all their lists
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  // one clock per page load, so every row's "3 hours ago" agrees
  const [now] = useState(Date.now);

  // the two routes have their own search types; the view reads both through `FeedSearch`
  const go = (
    next: FeedSearch | ((prev: FeedSearch) => FeedSearch),
    options: { replace?: boolean } = {},
  ) =>
    void navigate({
      to: forYou ? "/trade/for-you" : "/trade",
      search: next as never,
      resetScroll: false,
      ...options,
    });

  const setSearch = (patch: Partial<FeedSearch>) =>
    go((prev) => ({ ...prev, ...patch }), { replace: true });

  const type = postTypeOf(search, surface);
  const mutual = forYou && mode === "mutual";
  // a menu, not tabs, so the options Mutual disables never move the controls beside it
  const postType = (
    <SingleSelect
      label={m.trade_type_label()}
      options={TYPES.map((item) => ({
        value: item,
        label: item === "all" ? m.trade_filter_all() : tagText(item),
        disabled: mutual && item !== "wtt",
      }))}
      value={type}
      defaultValue="all"
      onChange={(next) => {
        const picked = next === "all" ? undefined : next;
        // a list the new type can't use is reset, so the URL never carries a dead choice
        setSearch({
          type: picked,
          list: comparedList(search.list, tradeLists, scopeOf(mode, next))?.slug,
        });
      }}
    />
  );
  // Mutual fixes the type to WTT, so a leftover `type` is not a filter to reset
  const collectionFiltering =
    search.slug !== undefined || FACETS.some((key) => (search[key]?.length ?? 0) > 0);
  const filtering = (!mutual && search.type !== undefined) || collectionFiltering;
  const comparedName = forYou
    ? comparedList(search.list, tradeLists, scopeOf(mode, type))?.name
    : undefined;
  // the matching choice isn't a filter: For you keeps it
  const reset = () =>
    go(forYou ? { match: search.match, list: search.list } : {}, { replace: true });
  // a person who moved between two pages can come back once more: first place wins
  const people = useMemo(() => {
    const seen = new Set<string>();
    return (query.data?.pages.flatMap((page) => page.people) ?? []).filter((person) => {
      if (seen.has(person.userId)) return false;
      seen.add(person.userId);
      return true;
    });
  }, [query.data]);
  // under Any a heading opens each run of people from the same section; Browse and Mutual only have none
  const rows = useMemo(() => {
    const out: FeedRow[] = [];
    let section: string | undefined;
    for (const person of people) {
      if (person.section && person.section !== section) out.push({ heading: person.section });
      section = person.section;
      out.push({ person });
    }
    return out;
  }, [people]);
  const collections = useMemo(
    () => Object.assign({}, ...(query.data?.pages.map((page) => page.collections) ?? [])),
    [query.data],
  ) as Record<string, ValidObjekt | undefined>;
  const { ref: virtualizerRef, cache: virtualizerCache } = useWindowVirtualizerRestore({
    count: rows.length,
    enabled: hydrated && rows.length > 0,
  });

  return (
    <OfferBuilderProvider>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-muted-foreground text-sm text-pretty max-md:hidden">
          {forYou ? m.trade_for_you_description() : m.trade_browse_description()}
        </p>
        {/* on Browse, New post lives in the Your posts row */}
        {user && forYou ? (
          <Button variant="outline" size="sm" onClick={() => composer.openWith(NEW_POST)}>
            <CardsThreeIcon />
            {m.trade_new_post()}
          </Button>
        ) : user ? null : (
          <Button
            variant="outline"
            size="sm"
            render={<Link to="/login" search={{ redirect: "/trade" }} />}
          >
            <CardsThreeIcon />
            {m.trade_new_post()}
          </Button>
        )}
      </div>

      {user && !forYou ? (
        <MyPosts
          onNew={() => composer.openWith(NEW_POST)}
          onEdit={(slug) => composer.openWith(startForPost(planLists, slug))}
        />
      ) : null}

      <BrowseFilters
        search={search}
        slugName={search.slug ? collectionName(search.slug, collections[search.slug]) : undefined}
        filtering={filtering}
        onClearSlug={() => setSearch({ slug: undefined })}
        onReset={reset}
        postType={postType}
        matching={
          forYou ? (
            <MatchingControls
              mode={matchModeOf(search)}
              urlType={search.type ?? "all"}
              list={search.list}
              tradeLists={tradeLists}
              onChange={(patch) => {
                const next = { ...search, match: mode, ...patch };
                // Mutual fixes the type to WTT, so a type picked under Any is dropped rather than kept
                setSearch({
                  ...patch,
                  match: next.match,
                  type: next.match === "mutual" ? undefined : next.type,
                });
              }}
            />
          ) : undefined
        }
        comparedLine={
          forYou ? (
            <ComparedLine
              mode={matchModeOf(search)}
              urlType={search.type ?? "all"}
              list={search.list}
              tradeLists={tradeLists}
            />
          ) : undefined
        }
      />

      {user ? null : (
        <p className="text-muted-foreground text-sm text-pretty">
          {m.trade_browse_matches_sign_in()}{" "}
          <Button
            variant="link"
            className="h-auto p-0 text-sm underline underline-offset-2"
            render={<Link to="/login" search={{ redirect: "/trade/for-you" }} />}
          >
            {m.nav_sign_in()}
          </Button>
        </p>
      )}

      {query.isPending ? (
        <>
          <PendingStatus />
          <BrowseFeedSkeleton />
        </>
      ) : query.isError && people.length === 0 ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : people.length === 0 && !query.hasNextPage && forYou && collectionFiltering ? (
        <EmptyState
          icon={CardsThreeIcon}
          title={m.trade_browse_no_filter_title()}
          hint={m.trade_browse_empty_hint()}
          action={
            <Button variant="outline" size="sm" onClick={reset}>
              {m.filter_reset_filter()}
            </Button>
          }
        />
      ) : people.length === 0 && !query.hasNextPage && mutual ? (
        <EmptyState
          icon={CardsThreeIcon}
          title={
            comparedName
              ? m.trade_browse_no_mutual_list_title({ list: comparedName })
              : m.trade_browse_no_mutual_title()
          }
          hint={m.trade_browse_no_mutual_hint()}
          action={
            <Button variant="outline" size="sm" onClick={() => setSearch({ match: "any" })}>
              {m.trade_browse_show_any()}
            </Button>
          }
        />
      ) : people.length === 0 && !query.hasNextPage && mode === "any" ? (
        <EmptyState
          icon={CardsThreeIcon}
          title={
            comparedName
              ? m.trade_browse_no_matches_list_title({ list: comparedName })
              : m.trade_browse_no_matches_title()
          }
          hint={m.trade_browse_no_matches_hint()}
          action={
            <Button
              variant="outline"
              size="sm"
              render={<Link to="/trade" search={forYouFallback(search)} />}
            >
              {m.trade_browse_show_all_posts()}
            </Button>
          }
        />
      ) : people.length === 0 && !query.hasNextPage ? (
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
          {/* the server draws the first posts, so a full load is not blank until hydration.
              virtua then keeps drawing only `ssrCount` rows until the first scroll, so the list
              remounts without it once hydrated: otherwise For you's headings take two of the
              four rows and the feed looks like it ends after two posts */}
          <WindowVirtualizer
            key={hydrated ? "live" : "ssr"}
            ref={virtualizerRef}
            cache={virtualizerCache}
            data={rows}
            ssrCount={hydrated ? undefined : Math.min(SSR_ROWS, rows.length)}
          >
            {(row: FeedRow | undefined) =>
              row?.heading ? (
                <h2
                  key={row.heading}
                  className="text-muted-foreground px-4 pt-1 pb-2 text-xs font-medium tracking-wide uppercase"
                >
                  {row.heading === "mutual" ? m.trade_section_mutual() : m.trade_section_one_way()}
                </h2>
              ) : row ? (
                <div key={row.person.userId}>
                  <PersonRow
                    person={row.person}
                    surface={surface}
                    own={row.person.userId === user?.user.id}
                    signedIn={!!user}
                    led={row.person.userId === search.person}
                    expanded={expanded.has(row.person.userId)}
                    onExpand={() => setExpanded((prev) => new Set(prev).add(row.person!.userId))}
                    onClear={() => setSearch({ person: undefined })}
                    collections={collections}
                    now={now}
                    onOpen={setActive}
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
      {user ? <PostComposer {...composer.dialog} /> : null}
      {user ? <HiddenPartnersDialog open={hiddenOpen} onOpenChange={setHiddenOpen} /> : null}
    </OfferBuilderProvider>
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
    <div>
      {Array.from({ length: SSR_ROWS }).map((_, index) => (
        <PersonRowSkeleton key={index} />
      ))}
    </div>
  );
}
