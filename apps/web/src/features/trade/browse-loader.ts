import type { Outputs } from "@repo/api";
import { type InfiniteData, type QueryClient, noop } from "@tanstack/react-query";

import { currentUserOptions } from "@/features/user/queries";
import { orpc } from "@/lib/orpc";
import { isClientError } from "@/lib/orpc-error";

import { type FeedSearch, oldPersonLink, type Surface, toBrowseInput } from "./browse-search";
import { tradeListsOf } from "./compare-rule";
import { peopleOptions, myPostsOptions, tradePersonOptions } from "./queries";

/**
 * The loader of both Trade surfaces, so the loader and `BrowseView` build the same query key.
 * Browse also loads Your posts, which sits above its feed; For you never lists them.
 */
export async function loadBrowse({
  queryClient,
  search,
  cause,
  surface,
}: {
  queryClient: QueryClient;
  search: FeedSearch;
  cause: string;
  surface: Surface;
}) {
  const [artists, selected, user] = await Promise.all([
    queryClient.query({ ...orpc.config.getArtists.queryOptions(), staleTime: "static" }),
    queryClient.query({ ...orpc.config.getSelectedArtists.queryOptions(), staleTime: "static" }),
    queryClient.query({ ...currentUserOptions, staleTime: "static" }),
  ]);
  const options = peopleOptions(
    toBrowseInput(search, artists, selected, surface, tradeListsOf(user?.lists ?? [])),
  );
  // a filter change keeps the current posts on screen while the next ones load
  if (cause === "stay") {
    void queryClient.infiniteQuery(options).catch(noop);
    return;
  }
  // a failed read leaves the view to show its error and retry, not the page to fail
  const feed = queryClient.infiniteQuery({ ...options, staleTime: "static" }).catch(noop);
  // Your posts sits above the feed, so it is in the first paint rather than pushing it down
  const mine =
    user && surface === "browse"
      ? queryClient.query({ ...myPostsOptions(), staleTime: "static" }).catch(noop)
      : undefined;
  await Promise.all([feed, mine]);
}

/** The one-person read a person or post page draws; the visitor's artist selection is ignored. */
export const personSearch = (userId: string): FeedSearch => ({ person: userId });

/**
 * A person page's row, read as the page's view reads it: the person's row, `null` when the feed
 * doesn't show them to this viewer, or `undefined` when the read failed, which the view retries.
 */
export async function loadPersonRow(args: { queryClient: QueryClient; userId: string }) {
  const { options, own } = await personRowOptions(args);
  const [feed] = await Promise.all([
    args.queryClient.infiniteQuery({ ...options, staleTime: "static" }).catch(() => undefined),
    loadOwnPosts(args.queryClient, own),
  ]);
  return feed && rowOf(feed, args.userId);
}

/** `loadPersonRow` for a caller that tells a refusal from a failure: the feed's error is thrown. */
export async function readPersonRow(args: { queryClient: QueryClient; userId: string }) {
  const { options } = await personRowOptions(args);
  const feed = await args.queryClient.infiniteQuery({ ...options, staleTime: "static" });
  return rowOf(feed, args.userId);
}

/** The owner's own page reads Your posts for its empty state, so the first paint isn't a visitor's. */
async function loadOwnPosts(queryClient: QueryClient, own: boolean) {
  if (own) await queryClient.query({ ...myPostsOptions(), staleTime: "static" }).catch(noop);
}

async function personRowOptions({
  queryClient,
  userId,
}: {
  queryClient: QueryClient;
  userId: string;
}) {
  const [artists, selected, user] = await Promise.all([
    queryClient.query({ ...orpc.config.getArtists.queryOptions(), staleTime: "static" }),
    queryClient.query({ ...orpc.config.getSelectedArtists.queryOptions(), staleTime: "static" }),
    queryClient.query({ ...currentUserOptions, staleTime: "static" }),
  ]);
  const options = peopleOptions(
    toBrowseInput(
      personSearch(userId),
      artists,
      selected,
      "browse",
      tradeListsOf(user?.lists ?? []),
    ),
  );
  return { options, own: user?.user.id === userId };
}

function rowOf(feed: InfiniteData<Outputs["trade"]["people"]>, userId: string) {
  const page = feed.pages[0];
  const row = page?.people.find((person) => person.userId === userId) ?? null;
  return { row, collections: page?.collections ?? {} };
}

/**
 * Where an older `person=<id>` (or For you's `partner=<id>`) link goes: that person's handle, or,
 * for an unknown id, an account with no page or any refused lookup (a bad id, the rate limit),
 * the search without the parameter. Null when there is no such parameter.
 */
export async function oldPersonTarget<T extends { person?: string; partner?: string }>(
  queryClient: QueryClient,
  search: T,
) {
  const link = oldPersonLink(search);
  if (!link) return null;
  const person = await queryClient
    .query(tradePersonOptions({ userId: link.id }))
    .catch((error: unknown) => {
      if (isClientError(error)) return null;
      throw error;
    });
  return person?.handle ? { handle: person.handle } : { rest: link.rest };
}
