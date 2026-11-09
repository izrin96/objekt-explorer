import { startForPost } from "@repo/api/schemas/trade-post";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useHydrated, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArtistScopeNarrowed, useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useSelectedArtists } from "@/features/artist/use-selected-artists";
import { FACET_KEYS } from "@/features/filters/facet-controls";
import { SingleSelect } from "@/features/filters/single-select";
import { AddToListProvider } from "@/features/list/add-to-list-dialog";
import { tagText } from "@/features/list/tag-label";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { collectionName } from "@/features/objekt/objekt-label";
import { useCurrentUser, useUserLists } from "@/features/user/hooks";
import { useWindowVirtualizerRestore } from "@/hooks/use-window-virtualizer-restore";
import { m } from "@/paraglide/messages";

import { BrowseEmpty } from "./browse-empty";
import { BrowseFeed, BrowseFeedSkeleton, type FeedRow } from "./browse-feed";
import { BrowseFilters } from "./browse-filters";
import { BrowseIntro } from "./browse-intro";
import {
  type FeedSearch,
  type Surface,
  matchModeOf,
  postTypeOf,
  toBrowseInput,
} from "./browse-search";
import { comparedList, scopeOf, tradeListsOf } from "./compare-rule";
import { NEW_POST } from "./composer/link";
import { useOpenComposer } from "./composer/use-open-composer";
import { HiddenPartnersDialog } from "./hidden-partners-dialog";
import { LoadError } from "./load-error";
import { ComparedLine, MatchingControls } from "./matching-controls";
import { MyPosts } from "./my-posts";
import type { NearOpen, ObjektAsk } from "./near";
import { NearNote } from "./near-note";
import { ObjektOfferNote } from "./objekt-offer-note";
import { usePlanLists } from "./post-plan";
import { hiddenPartnersOptions, peopleOptions } from "./queries";

type PostType = NonNullable<FeedSearch["type"]> | "all";

const TYPES: PostType[] = ["all", "wtt", "wtb", "wts"];

export function BrowseView({ surface, search }: { surface: Surface; search: FeedSearch }) {
  const { data: user } = useCurrentUser();
  const hydrated = useHydrated();
  const userLists = useUserLists();
  const forYou = surface === "forYou";
  const mode = forYou ? matchModeOf(search) : "off";
  const tradeLists = useMemo(() => tradeListsOf(userLists), [userLists]);
  const { artists } = useCosmoArtist();
  const { data: selected } = useSelectedArtists();
  const scopeNarrowed = useArtistScopeNarrowed();
  const input = useMemo(
    () => toBrowseInput(search, artists, selected, surface, tradeLists),
    [search, artists, selected, surface, tradeLists],
  );
  const query = useInfiniteQuery(peopleOptions(input));
  // the "+N" dialogs ring what the strips ring
  const sideCompare = useMemo(
    () => ({ list: input.list, mutual: input.match === "mutual" }),
    [input.list, input.match],
  );
  const hidden = useQuery(hiddenPartnersOptions(Boolean(user)));
  const navigate = useNavigate();
  // the drawer's On Trade link lands on this same page; the new slug closes the drawer
  const [opened, setOpened] = useState<{
    objekt: ValidObjekt;
    slug?: string;
    near?: NearOpen;
    ask?: ObjektAsk;
  } | null>(null);
  const active = opened && opened.slug === search.slug ? opened.objekt : null;
  const setActive = (objekt: ValidObjekt | null, near?: NearOpen, ask?: ObjektAsk) =>
    setOpened(objekt ? { objekt, slug: search.slug, near, ask } : null);
  const openComposer = useOpenComposer();
  const planLists = usePlanLists();
  const [hiddenOpen, setHiddenOpen] = useState(false);
  // rows read from their fetch, so every "3 hours ago" agrees, and the server's render too;
  // a placeholder carries 0 while the last filters' rows stay up, so those keep their own time
  const [now, setNow] = useState(query.dataUpdatedAt);
  if (!query.isPlaceholderData && query.dataUpdatedAt !== now) setNow(query.dataUpdatedAt);

  // the two routes have their own search types; the view reads both through `FeedSearch`
  const go = (
    next: FeedSearch | ((prev: FeedSearch) => FeedSearch),
    options: { replace?: boolean } = {},
  ) =>
    void navigate({
      from: forYou ? "/trade/for-you" : "/trade",
      to: ".",
      search: next,
      resetScroll: false,
      ...options,
    });

  const setSearch = (patch: Partial<FeedSearch>) =>
    go((prev) => ({ ...prev, ...patch }), { replace: true });
  // back to the feed as usual: every filter goes, but For you keeps its matching choice, which
  // isn't a filter
  const reset = () =>
    go(forYou ? { match: search.match, list: search.list } : {}, { replace: true });

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
    search.slug !== undefined || FACET_KEYS.some((key) => (search[key]?.length ?? 0) > 0);
  const filtering = (!mutual && search.type !== undefined) || collectionFiltering;
  const comparedTrade = forYou
    ? comparedList(search.list, tradeLists, scopeOf(mode, type))
    : undefined;
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
    // a near match's drawer adds the objekt to a sale list from here
    <AddToListProvider>
      <BrowseIntro forYou={forYou} signedIn={!!user} onNew={() => openComposer(NEW_POST)} />

      {user && !forYou ? (
        <MyPosts
          onNew={() => openComposer(NEW_POST)}
          onEdit={(slug) => openComposer(startForPost(planLists, slug))}
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

      {/* an empty placeholder is still loading, not an empty feed */}
      {query.isPending || (query.isPlaceholderData && people.length === 0) ? (
        <>
          <PendingStatus />
          <BrowseFeedSkeleton />
        </>
      ) : query.isError && people.length === 0 ? (
        <LoadError error={query.error} onRetry={() => void query.refetch()} />
      ) : people.length === 0 && !query.hasNextPage ? (
        <BrowseEmpty
          search={search}
          forYou={forYou}
          mode={mode}
          mutual={mutual}
          collectionFiltering={collectionFiltering}
          filtering={filtering}
          scopeNarrowed={scopeNarrowed}
          signedIn={!!user}
          comparedTrade={comparedTrade}
          userLists={userLists}
          tradeLists={tradeLists}
          onReset={reset}
          onSearch={setSearch}
        />
      ) : (
        <BrowseFeed
          rows={rows}
          surface={surface}
          viewerId={user?.user.id}
          signedIn={!!user}
          collections={collections}
          now={now}
          onOpen={setActive}
          sideCompare={sideCompare}
          hydrated={hydrated}
          virtualizerRef={virtualizerRef}
          virtualizerCache={virtualizerCache}
          isPlaceholderData={query.isPlaceholderData}
          isFetchNextPageError={query.isFetchNextPageError}
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          fetchNextPage={query.fetchNextPage}
        />
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

      <ObjektDrawer
        objekt={active}
        onClose={() => setActive(null)}
        note={
          active && opened?.near ? (
            <NearNote
              objekt={active}
              near={opened.near}
              onClose={() => setActive(null)}
              onCompose={openComposer}
            />
          ) : active && opened?.ask ? (
            // a near match's line carries its own Make offer
            <ObjektOfferNote ask={opened.ask} onClose={() => setActive(null)} />
          ) : undefined
        }
      />
      {user ? <HiddenPartnersDialog open={hiddenOpen} onOpenChange={setHiddenOpen} /> : null}
    </AddToListProvider>
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
