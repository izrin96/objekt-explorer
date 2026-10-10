import type { Outputs } from "@repo/api";

export type BrowsePostData = Outputs["trade"]["browse"]["posts"][number];
export type PostSideData = BrowsePostData["sides"][number];
export type PostTag = BrowsePostData["tag"];
