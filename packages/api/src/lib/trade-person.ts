import type { MatchCounts } from "../schemas/trade";

type Direction = { slug: string; trade: boolean; myListIds: number[] }[];

/** Distinct collections per direction, and those a trade list answers. */
export function matchCounts({
  theyHaveIWant,
  iHaveTheyWant,
}: {
  theyHaveIWant: Direction;
  iHaveTheyWant: Direction;
}): MatchCounts {
  const count = (matches: Direction, trade: boolean) =>
    new Set(matches.filter((match) => match.trade || !trade).map((match) => match.slug)).size;
  return {
    theyHave: count(theyHaveIWant, false),
    youHave: count(iHaveTheyWant, false),
    tradeTheyHave: count(theyHaveIWant, true),
    tradeYouHave: count(iHaveTheyWant, true),
  };
}

/** The viewer's lists behind each direction: want lists for "they have", have and sale lists for "you have". */
export function viewerListIds({
  theyHaveIWant,
  iHaveTheyWant,
}: {
  theyHaveIWant: Direction;
  iHaveTheyWant: Direction;
}) {
  const idsOf = (matches: Direction) => [...new Set(matches.flatMap((match) => match.myListIds))];
  return { wantListIds: idsOf(theyHaveIWant), haveListIds: idsOf(iHaveTheyWant) };
}
