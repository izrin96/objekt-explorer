import type { CandidateItem } from "@repo/api/schemas/offer";
import { createContext } from "react";

import { type Collections } from "./pick";

export type PickerSelection = {
  isSelected: (item: CandidateItem) => boolean;
  countOf: (item: CandidateItem) => number;
  /** an any-copy item's copies still free to ask for */
  copiesOf: (item: CandidateItem) => number;
  full: boolean;
  /** the id of the footer line that says the side is full */
  fullId: string;
  onToggle: (item: CandidateItem, collections: Collections) => void;
  onCount: (item: CandidateItem, count: number, collections: Collections) => void;
};

export const PickerSelectionContext = createContext<PickerSelection | null>(null);
