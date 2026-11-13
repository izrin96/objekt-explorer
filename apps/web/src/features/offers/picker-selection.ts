import type { CandidateItem, PartnerList } from "@repo/api/schemas/offer";
import { createContext } from "react";

import type { CopyGroup } from "./copy-groups";
import type { Collections, OfferPick } from "./pick";

export type PickerSelection = {
  /** the picker's working selection */
  selection: ReadonlyMap<string, OfferPick>;
  /** the side's free places */
  room: number;
  full: boolean;
  /** the partner's lists in order, which a dialog names a group's lists by; none on You give */
  lists: readonly PartnerList[];
  /** the id of the footer line that says the side is full */
  fullId: string;
  onToggle: (item: CandidateItem, collections: Collections) => void;
  onCount: (item: CandidateItem, count: number, collections: Collections) => void;
  /** opens the serial dialog; `opener` is the tile, which takes focus back when it closes, found by `groupKey` if its node was replaced */
  onOpen: (
    group: CopyGroup,
    collections: Collections,
    opener: HTMLElement,
    groupKey: string,
  ) => void;
};

export const PickerSelectionContext = createContext<PickerSelection | null>(null);
