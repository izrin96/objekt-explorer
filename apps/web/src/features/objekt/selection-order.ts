import { createContext } from "react";

/**
 * Card ids in the grid's on-screen order, after its own sorting and grouping,
 * so a shift-click selects the run between two cards as the user sees it.
 */
export const SelectionOrderContext = createContext<readonly string[] | null>(null);
