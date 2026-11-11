import { useElementSize } from "@/hooks/use-element-size";

/** Card width the grid aims for; the column count follows the container's width. */
const CELL_PX = 112;

/** The column count of a card grid in a dialog or sheet: one per `CELL_PX` of width, at least three. */
export function useCardColumns<T extends HTMLElement>() {
  const [ref, { width }] = useElementSize<T>();
  return { ref, measured: width > 0, columns: Math.max(3, Math.floor(width / CELL_PX)) };
}
