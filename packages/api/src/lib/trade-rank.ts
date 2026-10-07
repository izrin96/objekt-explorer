import type { ListTypeNew } from "../schemas/list";
import type { TradeFilter } from "../schemas/trade";

export const PARTNER_LIMIT = 50;
export const CANDIDATE_LIMIT = 200;
export const IDLE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type MyList = { id: number; listTypeNew: ListTypeNew };

/**
 * The lists each direction matches from. A named list narrows only its own direction,
 * so the other keeps all of the user's lists and a single list can still be mutual.
 * A list that is not one of the user's have or want lists is ignored.
 */
export function matchSides(myLists: MyList[], listId: number | null) {
  const named = myLists.find(
    (list) => list.id === listId && (list.listTypeNew === "have" || list.listTypeNew === "want"),
  );
  const side = (type: "have" | "want") =>
    named?.listTypeNew === type
      ? [named.id]
      : myLists.filter((list) => list.listTypeNew === type).map((list) => list.id);
  return { listId: named?.id ?? null, haveListIds: side("have"), wantListIds: side("want") };
}

/** `hidden`: held at an address that hides its owner, so it can't be offered by id and is never named */
export type Verdict = "ok" | "not_owned" | "not_transferable" | "hidden";
export type DropReason = Exclude<Verdict, "ok" | "hidden">;

/** A have or sale entry: one specific objekt, or (with no `objektId`) any copy of its collection. */
export type OwnedEntry = { listId: number; slug: string; objektId: string | null };

/**
 * What the indexer says about the entries in play. `objekts` is keyed by token id;
 * `copies` by `<owner>:<slug>`, true when at least one of that owner's copies is
 * transferable. Owners are lowercase.
 */
export type Holdings = {
  objekts: ReadonlyMap<string, { owner: string; transferable: boolean }>;
  copies: ReadonlyMap<string, boolean>;
};

export const copyKey = (owner: string, slug: string) => `${owner}:${slug}`;

const VERDICT_RANK: Record<Verdict, number> = {
  ok: 3,
  hidden: 2,
  not_transferable: 1,
  not_owned: 0,
};

/**
 * `tokenAddresses` are where a specific objekt may be offered: a partner's visible addresses,
 * as the offer picker allows. Any-copy entries count at every address, as the picker's do.
 */
export function entryVerdict(
  entry: OwnedEntry,
  addresses: ReadonlySet<string>,
  holdings: Holdings,
  tokenAddresses: ReadonlySet<string> = addresses,
): Verdict {
  if (entry.objektId !== null) {
    const objekt = holdings.objekts.get(entry.objektId);
    if (!objekt || !addresses.has(objekt.owner)) return "not_owned";
    if (!tokenAddresses.has(objekt.owner)) return "hidden";
    return objekt.transferable ? "ok" : "not_transferable";
  }

  let held = false;
  for (const address of addresses) {
    const transferable = holdings.copies.get(copyKey(address, entry.slug));
    if (transferable) return "ok";
    if (transferable === false) held = true;
  }
  return held ? "not_transferable" : "not_owned";
}

/** One collection's entries across the owner's lists: the best verdict wins, and `listIds` are the lists that can trade it. */
export function collectionVerdict(
  entries: OwnedEntry[],
  addresses: ReadonlySet<string>,
  holdings: Holdings,
  tokenAddresses: ReadonlySet<string> = addresses,
): { verdict: Verdict; listIds: number[] } {
  let best: Verdict = "not_owned";
  const listIds = new Set<number>();
  for (const entry of entries) {
    const verdict = entryVerdict(entry, addresses, holdings, tokenAddresses);
    if (verdict === "ok") listIds.add(entry.listId);
    if (VERDICT_RANK[verdict] > VERDICT_RANK[best]) best = verdict;
  }
  return { verdict: best, listIds: [...listIds] };
}

export function groupBySlug<T extends { slug: string }>(entries: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const group = groups.get(entry.slug);
    if (group) group.push(entry);
    else groups.set(entry.slug, [entry]);
  }
  return groups;
}

export type Match = { slug: string; myListIds: number[]; partnerListIds: number[] };
export type Dropped = {
  slug: string;
  direction: "theyHaveIWant" | "iHaveTheyWant";
  reason: DropReason;
};

export type Candidate = {
  userId: string;
  /** each matched list's last change, keyed by list id */
  listUpdatedAt: Record<string, string>;
  /** their have and sale entries on collections I want */
  theyHave: OwnedEntry[];
  /** their want entries on collections I have */
  theyWant: { listId: number; slug: string }[];
};

export type Recounted = {
  userId: string;
  updatedAt: string;
  theyHaveIWant: Match[];
  iHaveTheyWant: Match[];
  dropped: Dropped[];
};

/**
 * The candidate's matches after the ownership check. `myWants` maps a collection to
 * my want lists holding it; `myHaves` is my own have side, already judged.
 * `partnerVisible` are the partner's addresses that show their owner (see `entryVerdict`).
 */
export function recount(
  candidate: Candidate,
  partnerAddresses: ReadonlySet<string>,
  holdings: Holdings,
  myWants: ReadonlyMap<string, number[]>,
  myHaves: ReadonlyMap<string, { verdict: Verdict; listIds: number[] }>,
  partnerVisible: ReadonlySet<string>,
): Recounted {
  const theyHaveIWant: Match[] = [];
  const iHaveTheyWant: Match[] = [];
  const dropped: Dropped[] = [];

  for (const [slug, entries] of groupBySlug(candidate.theyHave)) {
    const { verdict, listIds } = collectionVerdict(
      entries,
      partnerAddresses,
      holdings,
      partnerVisible,
    );
    if (verdict === "ok") {
      theyHaveIWant.push({ slug, myListIds: myWants.get(slug) ?? [], partnerListIds: listIds });
    } else if (verdict !== "hidden") {
      dropped.push({ slug, direction: "theyHaveIWant", reason: verdict });
    }
  }

  for (const [slug, entries] of groupBySlug(candidate.theyWant)) {
    const mine = myHaves.get(slug);
    if (!mine) continue;
    if (mine.verdict === "ok") {
      iHaveTheyWant.push({
        slug,
        myListIds: mine.listIds,
        partnerListIds: [...new Set(entries.map((entry) => entry.listId))],
      });
    } else if (mine.verdict !== "hidden") {
      dropped.push({ slug, direction: "iHaveTheyWant", reason: mine.verdict });
    }
  }

  // idle is judged on the lists still contributing a match, not on one whose entries all dropped
  const contributing = new Set(
    [...theyHaveIWant, ...iHaveTheyWant].flatMap((match) => match.partnerListIds),
  );
  const changes = Object.entries(candidate.listUpdatedAt);
  const updatedAt = (
    changes.some(([id]) => contributing.has(Number(id)))
      ? changes.filter(([id]) => contributing.has(Number(id)))
      : changes
  ).reduce((latest, [, at]) => (at > latest ? at : latest), "");

  return { userId: candidate.userId, updatedAt, theyHaveIWant, iHaveTheyWant, dropped };
}

export function passesFilter(filter: TradeFilter, theyHave: number, theyWant: number) {
  switch (filter) {
    case "all":
      return theyHave > 0 || theyWant > 0;
    case "mutual":
      return theyHave > 0 && theyWant > 0;
    case "they_have":
      return theyHave > 0;
    case "they_want":
      return theyWant > 0;
  }
}

export function isIdle(updatedAt: string, now: Date) {
  return now.getTime() - new Date(updatedAt).getTime() >= IDLE_DAYS * DAY_MS;
}

type Rankable = { theyHaveIWant: unknown[]; iHaveTheyWant: unknown[]; updatedAt: string };

/** Active before idle, then the mutual score, the sum, and the most recent change. */
export function rankPartners<T extends Rankable>(partners: T[], filter: TradeFilter, now: Date) {
  return partners
    .filter((p) => passesFilter(filter, p.theyHaveIWant.length, p.iHaveTheyWant.length))
    .map((p) => ({
      partner: p,
      idle: isIdle(p.updatedAt, now),
      a: p.theyHaveIWant.length,
      b: p.iHaveTheyWant.length,
      at: new Date(p.updatedAt).getTime(),
    }))
    .toSorted(
      (x, y) =>
        Number(x.idle) - Number(y.idle) ||
        Math.min(y.a, y.b) - Math.min(x.a, x.b) ||
        y.a + y.b - (x.a + x.b) ||
        y.at - x.at,
    )
    .slice(0, PARTNER_LIMIT)
    .map(({ partner, idle }) => ({ partner, idle }));
}

export type NotShown = { notOwned: number; notTransferable: number };

/** One drop per owner and collection: the user's own sold objekt counts once, however many partners want it. */
export function countDropped(partners: { userId: string; dropped: Dropped[] }[]): NotShown {
  const seen = new Map<string, DropReason>();
  for (const partner of partners) {
    for (const entry of partner.dropped) {
      const owner = entry.direction === "iHaveTheyWant" ? "" : partner.userId;
      seen.set(`${owner}:${entry.slug}`, entry.reason);
    }
  }
  const reasons = [...seen.values()];
  return {
    notOwned: reasons.filter((reason) => reason === "not_owned").length,
    notTransferable: reasons.filter((reason) => reason === "not_transferable").length,
  };
}

export type AddressInfo = { address: string; nickname: string | null; hideNickname: boolean };
export type AddressRef = { address: string; nickname: string | null };
export type PartnerIdentity = {
  /** the Cosmo nickname, or the account name when there is none to show */
  name: string;
  /** set when `name` is a Cosmo nickname */
  address: string | null;
  /** the partner's other bound addresses among the matched lists */
  also: AddressRef[];
};

export function visibleNickname(info: Pick<AddressInfo, "nickname" | "hideNickname">) {
  return info.hideNickname ? null : (info.nickname ?? null);
}

/** Named by the address of the list with the most matches; `lists.hide_user` does not apply. */
export function toPartnerIdentity(
  accountName: string,
  matchedLists: { profileAddress: string | null; matches: number }[],
  addresses: AddressInfo[],
): PartnerIdentity {
  const byAddress = new Map(addresses.map((a) => [a.address.toLowerCase(), a]));
  const visible = (address: string): AddressRef => {
    const info = byAddress.get(address);
    return {
      address,
      nickname: info ? visibleNickname(info) : null,
    };
  };

  const ranked = matchedLists.toSorted(
    (x, y) =>
      y.matches - x.matches ||
      Number(y.profileAddress !== null) - Number(x.profileAddress !== null),
  );
  const bestAddress = ranked[0]?.profileAddress?.toLowerCase() ?? null;
  const best = bestAddress ? visible(bestAddress) : null;

  const heading = best?.nickname ? best : null;
  const others = new Set(
    ranked.flatMap((list) => (list.profileAddress ? [list.profileAddress.toLowerCase()] : [])),
  );
  if (bestAddress) others.delete(bestAddress);

  return {
    name: heading?.nickname ?? accountName,
    address: heading?.address ?? null,
    also: [...others].map(visible),
  };
}
