import type { OpenObjekt } from "./near";
import type { PostSideData } from "./post-types";

/** What a side's strip, its "+N" dialog and the sheet behind it all take. */
export type SideProps = {
  side: PostSideData;
  /** a filter or matching left objekts out, so the side says how many it holds; the sheet shows them all */
  narrowed: boolean;
  onOpen: OpenObjekt;
  /** the viewer's own post: a ratio reads "You ask" */
  owner?: boolean;
};
