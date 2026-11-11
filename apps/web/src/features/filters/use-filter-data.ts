import { createContext, use } from "react";

type FilterDataContextValue = {
  collections: string[];
  seasons: string[];
  classes: string[];
  compareSeason: (a: string, b: string) => number;
  compareClass: (a: string, b: string) => number;
};

export const FilterDataContext = createContext<FilterDataContextValue | null>(null);

export function useFilterData(): FilterDataContextValue {
  const ctx = use(FilterDataContext);
  if (!ctx) throw new Error("useFilterData must be used within FilterDataProvider");
  return ctx;
}
