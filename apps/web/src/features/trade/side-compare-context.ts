import { createContext } from "react";

/** For you's Compare with, as the feed sends it, so the sheet rings what the strip rings. */
export const SideCompareContext = createContext<{ list?: string; mutual: boolean }>({
  mutual: false,
});
